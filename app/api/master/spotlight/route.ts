import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { scoreCandidates } from '@/lib/feed-scoring';
import type { EditType, FeedEdit } from '@/lib/feed-scoring';

const EDIT_FIELDS =
  'id, edit_type, planet_id, interest_theme, hook, body, bridge, media_url, media_type, media_credit';

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
 */
export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [journeyPlanetIds, interestTheme, seenEditIds] = await Promise.all([
      loadJourneyPlanetIds(studentId),
      loadInterestTheme(studentId),
      loadSeenEditIds(studentId),
    ]);

    let candidates = await loadLiveEdits(journeyPlanetIds);
    if (candidates.length === 0 && journeyPlanetIds.length > 0) {
      candidates = await loadLiveEdits([]);
    }

    const scored = scoreCandidates(candidates, {
      activePlanetId: journeyPlanetIds[0] ?? null,
      interestTheme,
      seenEditIds,
      engagementCounts: { did_you_know: 0, inspiring_human: 0, real_world_connection: 0 },
    });

    const top = scored[0];
    if (!top) return NextResponse.json({ edit: null });

    const edit: SpotlightEdit = {
      id: top.id,
      edit_type: top.edit_type,
      hook: top.hook,
      media_url: top.media_url,
      media_type: top.media_type,
      media_credit: top.media_credit,
    };
    return NextResponse.json({ edit });
  } catch {
    // The panel's empty state is always a correct screen — never fail the home page.
    return NextResponse.json({ edit: null });
  }
}

/** Newest first, so recency breaks ties once the scorer has ranked by relevance. */
async function loadLiveEdits(planetIds: string[]): Promise<FeedEdit[]> {
  const query = supabaseAdmin
    .from('feed_edits')
    .select(EDIT_FIELDS)
    .eq('status', 'live')
    .order('created_at', { ascending: false });

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
