// Shared signal generation logic for teacher insights
//
// Used by:
// - GET /api/teacher/homescreen
// - GET /api/teacher/students
//
// Signal types represent different student support needs, ordered by intervention priority.

import { supabaseAdmin } from '@/lib/supabase-server';

export type SignalType = 'breakthrough' | 'grace_completion' | 'stuck' | 'non_engagement';

export interface StudentSignal {
  studentId: string;
  signalType: SignalType;
  signalCreatedAt: Date;
}

/**
 * Generates support signals for all students enrolled in a given journey.
 *
 * TODO (Phase 2): Replace this implementation with queries against
 * planet_summaries and planet_summary_goals once the planet completion
 * pipeline is live. The current implementation derives signals from
 * message activity as a Phase 1 approximation.
 *
 * Signal logic:
 * - If a message with "[SIGNAL:xxx]" content exists → use that override (test data only)
 * - If no messages since lastSessionAt → non_engagement
 * - No other signals detected yet (grace, stuck, breakthrough require planet data)
 */
// knownMissionIds: callers that already fetched missions (e.g. journeys-overview) pass
// them directly to skip the redundant Supabase round-trip.
export async function generateSignals(
  journeyId: string,
  lastSessionAt: Date | null,
  knownMissionIds?: string[],
): Promise<StudentSignal[]> {
  let missionIds: string[];

  if (knownMissionIds) {
    missionIds = knownMissionIds;
  } else {
    const { data: missionRows, error: missionsError } = await supabaseAdmin
      .from('missions')
      .select('id')
      .eq('journey_id', journeyId);

    if (missionsError) {
      console.error('[signals] missions query failed', missionsError);
      return [];
    }
    missionIds = (missionRows ?? []).map((m: { id: string }) => m.id);
  }

  if (missionIds.length === 0) return [];

  const { data: startedRows, error: startedError } = await supabaseAdmin
    .from('mission_started_by_student')
    .select('student_id, created_at')
    .in('mission_id', missionIds);

  if (startedError) {
    console.error('[signals] mission_started_by_student query failed', startedError);
    return [];
  }

  if (!startedRows || startedRows.length === 0) return [];

  // One signal per student — earliest started_at wins
  const byStudent = new Map<string, Date>();
  for (const row of startedRows) {
    const sid = row.student_id as string;
    const ts = new Date(row.created_at);
    if (!byStudent.has(sid) || ts < byStudent.get(sid)!) byStudent.set(sid, ts);
  }

  const since = lastSessionAt ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const studentIds = Array.from(byStudent.keys());

  // Run both message queries in parallel — they're independent.
  // Remove override query once planet_summaries pipeline is live.
  const [overridesResult, recentResult] = await Promise.all([
    supabaseAdmin
      .from('messages')
      .select('student_id, content, created_at')
      .in('student_id', studentIds)
      .in('mission_id', missionIds)
      .like('content', '[SIGNAL:%]')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('messages')
      .select('student_id')
      .in('student_id', studentIds)
      .in('mission_id', missionIds)
      .gte('created_at', since.toISOString()),
  ]);

  // Keep only the most recent override per student.
  const overrideByStudent = new Map<string, string>();
  for (const row of overridesResult.data ?? []) {
    if (!overrideByStudent.has(row.student_id as string)) {
      overrideByStudent.set(row.student_id as string, row.content as string);
    }
  }

  const { data: recentMsgs } = recentResult;

  const studentsWithActivity = new Set((recentMsgs ?? []).map(r => r.student_id as string));

  const signals: StudentSignal[] = [];

  for (const [studentId, startedAt] of Array.from(byStudent.entries())) {
    const overrideContent = overrideByStudent.get(studentId);
    if (overrideContent) {
      const match = overrideContent.match(/^\[SIGNAL:(\w+)\]/);
      const overrideType = match?.[1] as SignalType | undefined;
      if (overrideType && ['breakthrough', 'grace_completion', 'stuck', 'non_engagement'].includes(overrideType)) {
        signals.push({ studentId, signalType: overrideType, signalCreatedAt: startedAt });
        continue;
      }
    }

    if (!studentsWithActivity.has(studentId)) {
      signals.push({ studentId, signalType: 'non_engagement', signalCreatedAt: startedAt });
    }
  }

  return signals;
}
