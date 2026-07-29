import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import type { EditType } from '@/lib/feed-scoring';
import { pickEdit, type SpotlightCandidate, type StudentPlace } from '@/lib/spotlight-ranking';

const EDIT_FIELDS = 'id, edit_type, planet_id, interest_theme, hook, media_url, media_type, media_credit, created_at';

export interface SpotlightEdit {
  id: string;
  edit_type: EditType;
  hook: string;
  media_url: string;
  media_type: 'image' | 'video';
  media_credit: string;
}

/**
 * Comma-separated emails allowed to see the panel while it is behind the flag.
 * Unset = nobody sees it. Remove the gate to launch it to every student.
 */
function isAllowed(email: string | null): boolean {
  if (!email) return false;
  const allowlist = (process.env.CURIOSITY_PANEL_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

/**
 * One edit for the home curiosity panel — the doorway into Master.
 *
 * Every published edit is a candidate, so the panel is never empty; what
 * changes is the order. Fresh content first, then closeness to where the
 * student is (the planet they are on, then ones they finished, then ones ahead
 * of them, then other journeys entirely), then their declared interest, then
 * recency.
 *
 * Read-only by design — no impression is recorded, so the panel never silently
 * consumes feed content and collects nothing about the student.
 */
export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    if (!isAllowed(await loadEmail(studentId))) {
      return NextResponse.json({ enabled: false, edit: null });
    }

    const [place, candidates] = await Promise.all([loadStudentPlace(studentId), loadLiveEdits()]);

    const top = pickEdit(candidates, place);
    if (!top) return NextResponse.json({ enabled: true, edit: null });

    const edit: SpotlightEdit = {
      id: top.id,
      edit_type: top.edit_type,
      hook: top.hook,
      media_url: top.media_url,
      media_type: top.media_type,
      media_credit: top.media_credit,
    };
    return NextResponse.json({ enabled: true, edit });
  } catch {
    // The panel's empty state is always a correct screen — never fail the home page.
    return NextResponse.json({ enabled: true, edit: null });
  }
}

async function loadLiveEdits(): Promise<SpotlightCandidate[]> {
  const { data } = await supabaseAdmin.from('feed_edits').select(EDIT_FIELDS).eq('status', 'live');
  return (data ?? []) as SpotlightCandidate[];
}

/** Where this student is: the planet they are on, the ones behind, the ones ahead. */
async function loadStudentPlace(studentId: string): Promise<StudentPlace> {
  const [classRows, completedRows, interestTheme] = await Promise.all([
    supabaseAdmin.from('student_classes').select('class_id').eq('student_id', studentId),
    supabaseAdmin
      .from('planet_session_state')
      .select('planet_id')
      .eq('student_id', studentId)
      .eq('completed', true),
    loadInterestTheme(studentId),
  ]);

  const completedPlanetIds = new Set(
    (completedRows.data ?? []).map((r: { planet_id: string }) => r.planet_id),
  );
  const classIds = (classRows.data ?? []).map((c: { class_id: string }) => c.class_id);

  const place: StudentPlace = {
    activePlanetId: null,
    completedPlanetIds,
    journeyPlanetIds: new Set<string>(),
    interestTheme,
    seenEditIds: await loadSeenEditIds(studentId),
  };
  if (classIds.length === 0) return place;

  const [journeyRows, activeStateRows] = await Promise.all([
    supabaseAdmin.from('classes').select('journey_id').in('id', classIds),
    supabaseAdmin
      .from('class_mission_state')
      .select('mission_id')
      .in('class_id', classIds)
      .eq('state', 'active'),
  ]);

  const journeyIds = (journeyRows.data ?? [])
    .map((c: { journey_id: string | null }) => c.journey_id)
    .filter((id: string | null): id is string => !!id);

  if (journeyIds.length > 0) {
    const { data: missions } = await supabaseAdmin
      .from('missions')
      .select('id')
      .in('journey_id', journeyIds);

    const missionIds = (missions ?? []).map((m: { id: string }) => m.id);
    if (missionIds.length > 0) {
      const { data: planets } = await supabaseAdmin
        .from('planets')
        .select('id')
        .in('mission_id', missionIds);
      for (const p of planets ?? []) place.journeyPlanetIds.add(p.id);
    }
  }

  const activeMissionId = activeStateRows.data?.[0]?.mission_id;
  if (activeMissionId) {
    const { data: activePlanets } = await supabaseAdmin
      .from('planets')
      .select('id')
      .eq('mission_id', activeMissionId)
      .order('order', { ascending: true })
      .order('id', { ascending: true });

    const ids = (activePlanets ?? []).map((p: { id: string }) => p.id);
    for (const id of ids) place.journeyPlanetIds.add(id);
    // The planet they are on = the first one they have not finished.
    place.activePlanetId = ids.find((id: string) => !completedPlanetIds.has(id)) ?? ids[0] ?? null;
  }

  return place;
}

async function loadEmail(studentId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('id', studentId)
    .maybeSingle();

  return (data as { email?: string | null } | null)?.email ?? null;
}

async function loadInterestTheme(studentId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('students')
    .select('interests')
    .eq('id', studentId)
    .maybeSingle();

  const interests = (data as { interests?: unknown } | null)?.interests;
  const first = Array.isArray(interests) ? interests[0] : null;
  return typeof first === 'string' && first.trim() ? first : null;
}

async function loadSeenEditIds(studentId: string): Promise<Set<string>> {
  const { data } = await supabaseAdmin
    .from('feed_events')
    .select('edit_id')
    .eq('student_id', studentId)
    .eq('action', 'impression');

  return new Set((data ?? []).map((e: { edit_id: string }) => e.edit_id));
}
