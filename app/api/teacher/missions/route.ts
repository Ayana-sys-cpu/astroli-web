// =============================================================================
// /api/teacher/missions
//
// GET  ?id=<missionId>    — single mission with its plants
// GET  ?journeyId=<uuid>  — all missions for a journey
// PATCH { missionId, state } — update a mission's state
//
// All endpoints require a valid teacher session. Ownership of the journey
// (and thus the mission) is verified against the session's teacher_id before
// any read or write is performed.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';

// Map Supabase snake_case columns → camelCase shape the frontend expects.
function toMission(m: any) {
  return {
    id:                  m.id,
    journeyId:           m.journey_id,
    question:            m.question,
    questionDescription: m.question_description,
    projectTitle:        m.project_title,
    projectDescription:  m.project_description,
    openingMessage:      m.opening_message,
    state:               m.state,
    order:               m.mission_order,
    plants:              (m.plants ?? []).map((p: any) => ({
      id:             p.id,
      title:          p.title,
      content:        p.content,
      openingMessage: p.opening_message,
      mediaUrl:       p.media_url,
      mediaType:      p.media_type,
    })),
  };
}

/**
 * Verifies that the given journey belongs to the teacher.
 * Returns the journey id on success, null on failure.
 */
async function verifyJourneyOwnership(journeyId: string, teacherId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('journeys')
    .select('id')
    .eq('id', journeyId)
    .eq('teacher_id', teacherId)
    .maybeSingle();
  return data !== null;
}

// ---------------------------------------------------------------------------
// GET /api/teacher/missions?journeyId=   — list all missions for a journey
// GET /api/teacher/missions?id=          — single mission with its plants
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId  = auth.user.user_metadata.teacher_id as string;
  const missionId  = req.nextUrl.searchParams.get('id');

  // ── Single mission lookup ────────────────────────────────────────────────
  if (missionId) {
    // Fetch mission to determine journey_id for ownership check.
    const { data: missionRow, error: missionErr } = await supabaseAdmin
      .from('missions')
      .select('journey_id')
      .eq('id', missionId)
      .single();

    if (missionErr || !missionRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const owned = await verifyJourneyOwnership(missionRow.journey_id, teacherId);
    if (!owned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('missions')
      .select('*, plants(*)')
      .eq('id', missionId)
      .order('created_at', { referencedTable: 'plants' })
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ mission: toMission(data) });
  }

  // ── Mission list for a journey ────────────────────────────────────────────
  const journeyId = req.nextUrl.searchParams.get('journeyId');
  if (!journeyId) {
    return NextResponse.json({ error: 'journeyId or id required' }, { status: 400 });
  }

  const owned = await verifyJourneyOwnership(journeyId, teacherId);
  if (!owned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('missions')
    .select('*, plants(*)')
    .eq('journey_id', journeyId)
    .order('mission_order');

  if (error) {
    console.error('[GET /api/teacher/missions]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ missions: (data ?? []).map(toMission) });
}

// ---------------------------------------------------------------------------
// PATCH /api/teacher/missions
// Body: { missionId: string; state: MissionState }
// Updates a single mission's state. Supabase Realtime automatically publishes
// the UPDATE event to all subscribed clients — no extra push needed.
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;

  let body: { missionId?: string; state?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { missionId, state } = body;
  if (!missionId || !state) {
    return NextResponse.json({ error: 'missionId and state required' }, { status: 400 });
  }

  // Verify ownership: fetch the mission's journey, then check the teacher owns it.
  const { data: missionRow, error: lookupErr } = await supabaseAdmin
    .from('missions')
    .select('journey_id')
    .eq('id', missionId)
    .single();

  if (lookupErr || !missionRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const owned = await verifyJourneyOwnership(missionRow.journey_id, teacherId);
  if (!owned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('missions')
    .update({ state })           // updated_at handled by the DB trigger
    .eq('id', missionId)
    .select()
    .single();

  if (error) {
    console.error('[PATCH /api/teacher/missions]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Supabase fires a postgres_changes UPDATE event here automatically.
  // Every client running useSupabaseRealtime({ journeyId }) receives it
  // within ~100ms — no polling, no manual broadcast needed.
  return NextResponse.json({ mission: data });
}
