import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { scoreCandidates } from '@/lib/feed-scoring';
import type { EditType, FeedEdit } from '@/lib/feed-scoring';

const EDIT_FIELDS =
  'id, edit_type, planet_id, interest_theme, hook, body, bridge, media_url, media_type, media_credit';

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

export interface SpotlightEdit {
  id: string;
  edit_type: EditType;
  hook: string;
  media_url: string;
  media_type: 'image' | 'video';
  media_credit: string;
}

/**
 * One edit for the home curiosity panel — the doorway into Master.
 *
 * Selection reuses the feed's own scoring so there is never a second ranking to
 * maintain. Unlike the feed it falls back to every live edit when the student
 * has no active mission: home is the door to exploring beyond the curriculum,
 * so a student between missions must still be met by something.
 *
 * Read-only by design — no impression is recorded, so the panel never silently
 * consumes feed content and collects nothing about the student.
 *
 * Behind an allowlist flag while it is being tried out: everyone else gets
 * `enabled: false` and no panel at all. Allowlisted previewers also see edits
 * still awaiting publication, so the panel is never empty while the library is
 * unpublished — students never do.
 */
export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const preview = isAllowed(await loadEmail(studentId));
    if (!preview) return NextResponse.json({ enabled: false, edit: null });

    const [journeyPlanetIds, interestTheme, seenEditIds] = await Promise.all([
      loadJourneyPlanetIds(studentId),
      loadInterestTheme(studentId),
      loadSeenEditIds(studentId),
    ]);

    // Widen the net until something is found: this student's journey, then the
    // whole published library, then — for previewers only — unpublished edits.
    let candidates = await loadEdits(journeyPlanetIds, false);
    if (candidates.length === 0) candidates = await loadEdits([], false);
    if (candidates.length === 0 && preview) candidates = await loadEdits([], true);

    const scored = scoreCandidates(candidates, {
      activePlanetId: journeyPlanetIds[0] ?? null,
      interestTheme,
      seenEditIds,
      engagementCounts: { did_you_know: 0, inspiring_human: 0, real_world_connection: 0 },
    });

    // Everything already seen is better than an empty panel — show it again.
    const top = scored[0] ?? candidates[0];
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

/**
 * Newest first, so recency breaks ties once the scorer has ranked by relevance.
 * `unpublished` widens to draft edits — preview only, and only ones that have
 * passed the safety check, since this content is read by minors.
 */
async function loadEdits(planetIds: string[], unpublished: boolean): Promise<FeedEdit[]> {
  let query = supabaseAdmin
    .from('feed_edits')
    .select(EDIT_FIELDS)
    .order('created_at', { ascending: false });

  query = unpublished
    ? query.eq('status', 'draft').eq('safety_pass', true)
    : query.eq('status', 'live');

  const { data } = planetIds.length > 0 ? await query.in('planet_id', planetIds) : await query;
  return (data ?? []) as FeedEdit[];
}

async function loadJourneyPlanetIds(studentId: string): Promise<string[]> {
  const { data: classRows } = await supabaseAdmin
    .from('student_classes')
    .select('class_id')
    .eq('student_id', studentId);

  const classIds = (classRows ?? []).map((c: { class_id: string }) => c.class_id);
  if (classIds.length === 0) return [];

  const { data: missionStates } = await supabaseAdmin
    .from('class_mission_state')
    .select('mission_id')
    .in('class_id', classIds)
    .eq('state', 'active');

  const missionId = missionStates?.[0]?.mission_id;
  if (!missionId) return [];

  const { data: planets } = await supabaseAdmin
    .from('planets')
    .select('id')
    .eq('mission_id', missionId)
    .order('order', { ascending: true });

  return (planets ?? []).map((p: { id: string }) => p.id);
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
