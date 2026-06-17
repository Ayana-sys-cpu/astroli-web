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
 * Phase 1 approximation: signals are derived from message activity because
 * planet_summaries and planet_summary_goals are not yet populated by the
 * planet completion pipeline. When that pipeline is live, replace these
 * queries with reads against those tables.
 *
 * Signal logic:
 * - If a message with "[SIGNAL:xxx]" content exists → use that override (test data only)
 * - If no messages since lastSessionAt → non_engagement
 * - breakthrough, stuck, grace_completion require planet data (not yet available)
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

// ---------------------------------------------------------------------------
// Batch variant — collapses N×3 Supabase queries (one set per journey) down
// to 3–4 total queries regardless of how many journeys are passed. Use this
// whenever you need signals for multiple journeys in one request.
//
// missionIds is optional per entry; omit it and the function fetches all
// mission IDs for the relevant journeys in one extra query.
//
// Returns a Map<journeyId, StudentSignal[]>.
// ---------------------------------------------------------------------------
export async function generateSignalsBatch(
  entries: { journeyId: string; missionIds?: string[]; lastSessionAt: Date | null }[],
): Promise<Map<string, StudentSignal[]>> {
  // Resolve mission IDs for any entries that didn't pre-load them.
  const missingJourneyIds = entries
    .filter(e => !e.missionIds || e.missionIds.length === 0)
    .map(e => e.journeyId);

  const fetchedMissionIds = new Map<string, string[]>();
  if (missingJourneyIds.length > 0) {
    const { data: missionRows, error } = await supabaseAdmin
      .from('missions')
      .select('id, journey_id')
      .in('journey_id', missingJourneyIds);

    if (error) {
      console.error('[signals batch] missions lookup', error);
    }
    for (const row of missionRows ?? []) {
      const jid = row.journey_id as string;
      if (!fetchedMissionIds.has(jid)) fetchedMissionIds.set(jid, []);
      fetchedMissionIds.get(jid)!.push(row.id as string);
    }
  }

  const resolved = entries.map(e => ({
    ...e,
    missionIds: (e.missionIds && e.missionIds.length > 0)
      ? e.missionIds
      : (fetchedMissionIds.get(e.journeyId) ?? []),
  }));

  const allMissionIds = resolved.flatMap(e => e.missionIds);
  if (allMissionIds.length === 0) return new Map(resolved.map(e => [e.journeyId, []]));

  // mission_id → journey_id for attributing rows back to their journey
  const missionToJourney = new Map<string, string>();
  for (const e of resolved) {
    for (const mid of e.missionIds) missionToJourney.set(mid, e.journeyId);
  }

  // Query 1: who started which missions
  const { data: startedRows, error: startedError } = await supabaseAdmin
    .from('mission_started_by_student')
    .select('student_id, mission_id, created_at')
    .in('mission_id', allMissionIds);

  if (startedError) {
    console.error('[signals batch] mission_started_by_student', startedError);
    return new Map(resolved.map(e => [e.journeyId, []]));
  }

  if (!startedRows || startedRows.length === 0) return new Map(resolved.map(e => [e.journeyId, []]));

  // Group: journeyId → studentId → earliest started_at
  const byJourneyStudent = new Map<string, Map<string, Date>>();
  for (const e of resolved) byJourneyStudent.set(e.journeyId, new Map());

  for (const row of startedRows) {
    const journeyId = missionToJourney.get(row.mission_id as string);
    if (!journeyId) continue;
    const jMap = byJourneyStudent.get(journeyId)!;
    const sid = row.student_id as string;
    const ts  = new Date(row.created_at);
    if (!jMap.has(sid) || ts < jMap.get(sid)!) jMap.set(sid, ts);
  }

  const allStudentIds = Array.from(new Set(startedRows.map(r => r.student_id as string)));

  // Earliest since across all journeys — DB filters to the widest window, then
  // per-journey filtering happens in memory.
  const sinceByJourney = new Map<string, Date>(
    resolved.map(e => [e.journeyId, e.lastSessionAt ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]),
  );
  const earliestSince = Array.from(sinceByJourney.values()).reduce(
    (min, d) => (d < min ? d : min),
    new Date(),
  );

  // Queries 2 + 3 in parallel
  const [overridesResult, recentResult] = await Promise.all([
    supabaseAdmin
      .from('messages')
      .select('student_id, mission_id, content, created_at')
      .in('student_id', allStudentIds)
      .in('mission_id', allMissionIds)
      .like('content', '[SIGNAL:%]')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('messages')
      .select('student_id, mission_id, created_at')
      .in('student_id', allStudentIds)
      .in('mission_id', allMissionIds)
      .gte('created_at', earliestSince.toISOString()),
  ]);

  // Most-recent override per (journeyId, studentId)
  const overrideKey = (jid: string, sid: string) => `${jid}:${sid}`;
  const overrideMap = new Map<string, string>();
  for (const row of overridesResult.data ?? []) {
    const journeyId = missionToJourney.get(row.mission_id as string);
    if (!journeyId) continue;
    const k = overrideKey(journeyId, row.student_id as string);
    if (!overrideMap.has(k)) overrideMap.set(k, row.content as string);
  }

  // Recent activity per journey — honour per-journey since cutoff
  const activeByJourney = new Map<string, Set<string>>(resolved.map(e => [e.journeyId, new Set()]));
  for (const row of recentResult.data ?? []) {
    const journeyId = missionToJourney.get(row.mission_id as string);
    if (!journeyId) continue;
    const jSince = sinceByJourney.get(journeyId)!;
    if (new Date(row.created_at) >= jSince) {
      activeByJourney.get(journeyId)!.add(row.student_id as string);
    }
  }

  // Build per-journey signal lists
  const result = new Map<string, StudentSignal[]>();
  for (const entry of resolved) {
    const jMap   = byJourneyStudent.get(entry.journeyId) ?? new Map<string, Date>();
    const active = activeByJourney.get(entry.journeyId)  ?? new Set<string>();
    const signals: StudentSignal[] = [];

    for (const [studentId, startedAt] of Array.from(jMap.entries())) {
      const override = overrideMap.get(overrideKey(entry.journeyId, studentId));
      if (override) {
        const match       = override.match(/^\[SIGNAL:(\w+)\]/);
        const overrideType = match?.[1] as SignalType | undefined;
        if (overrideType && ['breakthrough', 'grace_completion', 'stuck', 'non_engagement'].includes(overrideType)) {
          signals.push({ studentId, signalType: overrideType, signalCreatedAt: startedAt });
          continue;
        }
      }
      if (!active.has(studentId)) {
        signals.push({ studentId, signalType: 'non_engagement', signalCreatedAt: startedAt });
      }
    }

    result.set(entry.journeyId, signals);
  }

  return result;
}
