import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { resolveStudentIdFromRequest } from '@/lib/auth';

// ── Types ─────────────────────────────────────────────────────────────────────

type TriggerType =
  | 'return-planet'
  | 'return-goals'
  | 'return-goal'
  | 'return-no-activity';

interface VisitSnapshot {
  planets: Record<string, { discoveredGoalCount: number; completedAt: string | null }>;
}

interface ReturnTrigger {
  type: TriggerType;
  planetName: string | null;
  goalText: string | null;
  goalCount: number | null;
}

interface PipMessageRow {
  id: string;
  role: 'pip' | 'student';
  content: string;
  trigger_type: string;
  created_at: string;
}

// ── GET /api/student/mission-state ────────────────────────────────────────────
// Returns confirmedAt, returnTrigger (null on first visit), and pip message history.
// Also updates last_map_visit_at + last_visit_snapshot atomically.

export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const missionId = searchParams.get('missionId');
  if (!missionId) return NextResponse.json({ error: 'missionId is required' }, { status: 400 });

  try {
    // 1. Load existing state row
    const { data: stateRow } = await supabaseAdmin
      .from('student_mission_state')
      .select('confirmed_at, last_map_visit_at, last_visit_snapshot')
      .eq('student_id', studentId)
      .eq('mission_id', missionId)
      .maybeSingle();

    // 2. Load pip message history (chronological)
    const { data: messageRows } = await supabaseAdmin
      .from('pip_messages')
      .select('id, role, content, trigger_type, created_at')
      .eq('student_id', studentId)
      .eq('mission_id', missionId)
      .order('created_at', { ascending: true });

    const pipMessages = (messageRows ?? []).map((m: PipMessageRow) => ({
      id:          m.id,
      role:        m.role,
      content:     m.content,
      triggerType: m.trigger_type,
      createdAt:   m.created_at,
    }));

    // 3. First visit — no confirmed_at yet
    if (!stateRow?.confirmed_at) {
      await upsertVisitTimestamp(studentId, missionId, null);
      return NextResponse.json({ confirmedAt: null, returnTrigger: null, pipMessages });
    }

    // 4. Confirmed student — compute return trigger
    const lastSnapshot: VisitSnapshot = (stateRow.last_visit_snapshot as VisitSnapshot) ?? { planets: {} };
    const { trigger, currentSnapshot } = await computeReturnTrigger(studentId, missionId, lastSnapshot);

    // 5. Update last_map_visit_at + snapshot
    await upsertVisitTimestamp(studentId, missionId, currentSnapshot);

    return NextResponse.json({
      confirmedAt:   stateRow.confirmed_at,
      returnTrigger: trigger,
      pipMessages,
    });
  } catch (err) {
    console.error('[mission-state GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST /api/student/mission-state ──────────────────────────────────────────
// Saves confirmed_at on first "הבנתי" click. Idempotent.

export async function POST(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let missionId: string | undefined;
  try {
    const body = await req.json();
    missionId = body?.missionId;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!missionId) return NextResponse.json({ error: 'missionId is required' }, { status: 400 });

  try {
    // Check existing row — don't overwrite if already confirmed
    const { data: existing } = await supabaseAdmin
      .from('student_mission_state')
      .select('confirmed_at')
      .eq('student_id', studentId)
      .eq('mission_id', missionId)
      .maybeSingle();

    if (existing?.confirmed_at) {
      return NextResponse.json({ confirmedAt: existing.confirmed_at });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('student_mission_state')
      .upsert(
        { student_id: studentId, mission_id: missionId, confirmed_at: now, updated_at: now },
        { onConflict: 'student_id,mission_id', ignoreDuplicates: false },
      )
      .select('confirmed_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ confirmedAt: data.confirmed_at });
  } catch (err) {
    console.error('[mission-state POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function upsertVisitTimestamp(
  studentId: string,
  missionId: string,
  snapshot: VisitSnapshot | null,
) {
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    student_id:         studentId,
    mission_id:         missionId,
    last_map_visit_at:  now,
    updated_at:         now,
  };
  if (snapshot !== null) update.last_visit_snapshot = snapshot;
  await supabaseAdmin
    .from('student_mission_state')
    .upsert(update, { onConflict: 'student_id,mission_id', ignoreDuplicates: false });
}

async function computeReturnTrigger(
  studentId: string,
  missionId: string,
  lastSnapshot: VisitSnapshot,
): Promise<{ trigger: ReturnTrigger; currentSnapshot: VisitSnapshot }> {
  // 1. Get all planets for this mission
  const { data: planets } = await supabaseAdmin
    .from('planets')
    .select('id, title, translations, mission_id')
    .eq('mission_id', missionId);

  const planetIds = (planets ?? []).map((p: { id: string }) => p.id);

  if (planetIds.length === 0) {
    return {
      trigger: { type: 'return-no-activity', planetName: null, goalText: null, goalCount: null },
      currentSnapshot: { planets: {} },
    };
  }

  // 2. Get current session state for all planets
  const { data: sessions } = await supabaseAdmin
    .from('planet_session_state')
    .select('planet_id, perkins_map, completed_at')
    .eq('student_id', studentId)
    .in('planet_id', planetIds);

  // 3. Build current snapshot
  const currentSnapshot: VisitSnapshot = { planets: {} };
  for (const s of sessions ?? []) {
    const map = (s.perkins_map as Record<string, number | null>) ?? {};
    const discoveredGoalCount = Object.values(map).filter((v) => v !== null).length;
    currentSnapshot.planets[s.planet_id as string] = {
      discoveredGoalCount,
      completedAt: (s.completed_at as string | null) ?? null,
    };
  }

  // 4. Compute delta — find the highest-priority trigger
  let newlyCompletedPlanet: { id: string; title: string } | null = null;
  let newGoalCount = 0;
  let mostRecentNewGoalPlanetId: string | null = null;

  for (const planet of planets ?? []) {
    const pid = planet.id as string;
    const current = currentSnapshot.planets[pid] ?? { discoveredGoalCount: 0, completedAt: null };
    const prev = lastSnapshot.planets[pid] ?? { discoveredGoalCount: 0, completedAt: null };

    if (current.completedAt && !prev.completedAt) {
      newlyCompletedPlanet = { id: pid, title: getPlanetTitle(planet) };
    }
    const delta = current.discoveredGoalCount - prev.discoveredGoalCount;
    if (delta > 0) {
      newGoalCount += delta;
      mostRecentNewGoalPlanetId = pid;
    }
  }

  // 5. Planet completion is highest priority
  if (newlyCompletedPlanet) {
    return {
      trigger: {
        type:       'return-planet',
        planetName: newlyCompletedPlanet.title,
        goalText:   null,
        goalCount:  null,
      },
      currentSnapshot,
    };
  }

  // 6. Goal-based triggers — fetch goal text
  if (newGoalCount > 0 && mostRecentNewGoalPlanetId) {
    const goalText = await resolveNewGoalText(
      studentId,
      mostRecentNewGoalPlanetId,
      lastSnapshot.planets[mostRecentNewGoalPlanetId]?.discoveredGoalCount ?? 0,
      missionId,
    );

    return {
      trigger: {
        type:      newGoalCount >= 2 ? 'return-goals' : 'return-goal',
        planetName: null,
        goalText,
        goalCount: newGoalCount,
      },
      currentSnapshot,
    };
  }

  // 7. No activity
  return {
    trigger: { type: 'return-no-activity', planetName: null, goalText: null, goalCount: null },
    currentSnapshot,
  };
}

function getPlanetTitle(planet: { title: string; translations: unknown }): string {
  const tx = planet.translations as Record<string, { title?: string }> | null;
  return tx?.he?.title ?? planet.title;
}

async function resolveNewGoalText(
  _studentId: string,
  planetId: string,
  prevCount: number,
  missionId: string,
): Promise<string | null> {
  const { data: mission } = await supabaseAdmin
    .from('missions')
    .select('language')
    .eq('id', missionId)
    .maybeSingle();
  const lang = (mission as { language?: string } | null)?.language ?? 'en';

  const { data: goals } = await supabaseAdmin
    .from('planet_teaching_goals')
    .select('description, translations')
    .eq('planet_id', planetId)
    .order('goal_order', { ascending: true });

  if (!goals || goals.length === 0) return null;

  const newGoal = goals[prevCount];
  if (!newGoal) return goals[goals.length - 1]?.description ?? null;

  if (lang === 'he') {
    const tx = (newGoal.translations as Record<string, { description?: string }> | null);
    return tx?.he?.description ?? newGoal.description;
  }
  return newGoal.description;
}
