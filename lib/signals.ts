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
export async function generateSignals(
  journeyId: string,
  lastSessionAt: Date | null,
): Promise<StudentSignal[]> {
  const { data: missionRows, error: missionsError } = await supabaseAdmin
    .from('missions')
    .select('id')
    .eq('journey_id', journeyId);

  if (missionsError) {
    console.error('[signals] missions query failed', missionsError);
    return [];
  }

  const missionIds = (missionRows ?? []).map((m: { id: string }) => m.id);
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

  const signals: StudentSignal[] = [];
  const since = lastSessionAt ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const [studentId, startedAt] of Array.from(byStudent.entries())) {
    // Test signal override — scoped to this journey's missions to avoid cross-journey contamination.
    // Remove once planet_summaries pipeline is live.
    const { data: overrideMsg } = await supabaseAdmin
      .from('messages')
      .select('content')
      .eq('student_id', studentId)
      .in('mission_id', missionIds)
      .like('content', '[SIGNAL:%]')
      .order('created_at', { ascending: false })
      .limit(1);

    if (overrideMsg && overrideMsg.length > 0) {
      const match = (overrideMsg[0].content as string).match(/^\[SIGNAL:(\w+)\]/);
      const overrideType = match?.[1] as SignalType | undefined;
      if (overrideType && ['breakthrough', 'grace_completion', 'stuck', 'non_engagement'].includes(overrideType)) {
        signals.push({ studentId, signalType: overrideType, signalCreatedAt: startedAt });
        continue;
      }
    }

    // Default: non_engagement if no messages in this journey's missions since last session
    const { count, error: countError } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .in('mission_id', missionIds)
      .gte('created_at', since.toISOString());

    if (countError) {
      console.error('[signals] message count query failed', countError);
      continue;
    }

    if ((count ?? 0) === 0) {
      signals.push({ studentId, signalType: 'non_engagement', signalCreatedAt: startedAt });
    }
  }

  return signals;
}
