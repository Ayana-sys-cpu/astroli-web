// =============================================================================
// SUPABASE VERSION — /api/teacher/missions
//
// Drop-in replacement for route.ts once supabase/schema.sql has been run.
// Steps to activate:
//   1. Run supabase/schema.sql in the Supabase SQL Editor.
//   2. Run: npm install @supabase/supabase-js   (in src/astroli-web/)
//   3. Add env vars to .env.local (see lib/supabase.ts for required keys).
//   4. Seed the missions + plants tables (update prisma/seed.ts or write a
//      one-off SQL INSERT based on docs/specs/HARDCODED_MISSIONS_PLANTS.md).
//   5. Rename this file to route.ts  (delete the old Prisma route.ts first).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

// ---------------------------------------------------------------------------
// GET /api/teacher/missions?journeyId=   — list all missions for a journey
// GET /api/teacher/missions?id=          — single mission with its plants
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const missionId = req.nextUrl.searchParams.get('id');

  // ── Single mission lookup ────────────────────────────────────────────────
  if (missionId) {
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
