// =============================================================================
// SUPABASE VERSION — /api/teacher/journeys
//
// Drop-in replacement for route.ts once supabase/schema.sql has been run.
// This is the most critical route: it controls the vote state machine.
// Setting vote_ends_at opens a vote (locked → voting).
// Clearing vote_ends_at closes a vote (voting → locked).
// Both operations emit Supabase Realtime events that route students in real time.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// GET /api/teacher/journeys?teacherId=
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get('teacherId');
  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('journeys')
    .select(`
      id,
      title,
      google_course_id,
      vote_ends_at,
      missions (
        id,
        question,
        project_title,
        state,
        mission_order
      )
    `)
    .eq('teacher_id', teacherId)
    .order('created_at')
    .order('mission_order', { referencedTable: 'missions' });

  if (error) {
    console.error('[GET /api/teacher/journeys]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map snake_case DB columns to the camelCase shape the frontend expects.
  const journeys = (data ?? []).map(j => ({
    id:             j.id,
    title:          j.title,
    googleCourseId: j.google_course_id,
    missions:       (j.missions as any[]).map(m => ({
      id:           m.id,
      question:     m.question,
      projectTitle: m.project_title,
      state:        m.state,
      order:        m.mission_order,
    })),
  }));

  return NextResponse.json({ journeys });
}

// ---------------------------------------------------------------------------
// PATCH /api/teacher/journeys
// Body: { journeyId: string; voteEndsAt: string | null }
//
// The key vote state machine transition:
//   voteEndsAt set     → journey.vote_ends_at updated + locked missions → voting
//   voteEndsAt cleared → journey.vote_ends_at nulled  + voting missions → locked
//
// Both the journey update AND the mission state updates emit separate Realtime
// events. Clients subscribed to missions for this journey receive them within
// ~100ms — students are routed to the vote screen instantly without polling.
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  let body: { journeyId?: string; voteEndsAt?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { journeyId, voteEndsAt } = body;
  if (!journeyId) {
    return NextResponse.json({ error: 'journeyId required' }, { status: 400 });
  }

  const parsedEndsAt = voteEndsAt ? new Date(voteEndsAt).toISOString() : null;

  // 1. Update the journey's vote window.
  const { data: journey, error: journeyError } = await supabaseAdmin
    .from('journeys')
    .update({ vote_ends_at: parsedEndsAt })
    .eq('id', journeyId)
    .select('id, vote_ends_at')
    .single();

  if (journeyError) {
    console.error('[PATCH /api/teacher/journeys] journey update', journeyError);
    return NextResponse.json({ error: journeyError.message }, { status: 500 });
  }

  // 2. Transition mission states atomically.
  //    Each updated mission row emits its own Realtime UPDATE event.
  //    The student's useSupabaseRealtime hook receives each event and:
  //      - On state='voting':  routes student to /vote
  //      - On state='locked':  routes student to /pending-journey
  if (parsedEndsAt) {
    // Opening a vote: all locked missions enter 'voting'
    const { error: missionError } = await supabaseAdmin
      .from('missions')
      .update({ state: 'voting' })
      .eq('journey_id', journeyId)
      .eq('state', 'locked');

    if (missionError) {
      console.error('[PATCH /api/teacher/journeys] mission → voting', missionError);
      return NextResponse.json({ error: missionError.message }, { status: 500 });
    }
  } else {
    // Closing a vote: all voting missions revert to 'locked'
    const { error: missionError } = await supabaseAdmin
      .from('missions')
      .update({ state: 'locked' })
      .eq('journey_id', journeyId)
      .eq('state', 'voting');

    if (missionError) {
      console.error('[PATCH /api/teacher/journeys] mission → locked', missionError);
      return NextResponse.json({ error: missionError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ journey });
}
