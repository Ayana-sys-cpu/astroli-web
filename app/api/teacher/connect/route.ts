// =============================================================================
// SUPABASE VERSION — /api/teacher/connect
//
// Drop-in replacement for route.ts. Accepts the exact same request/response
// shape as the Prisma version so the frontend (ConnectState component) works
// without any changes:
//
//   Request:  POST { teacherId: string; courses: { id: string; name: string }[] }
//   Response: { ok: true; journeyId: string }
//
// WHAT THIS ROUTE DOES:
//   The teacher is already in Supabase by the time this is called — the
//   Supabase identify route upserts the teacher row during sign-in.
//   This route only handles the course → journey step:
//
//   For each course:
//     1. Upsert a journey row (keyed by google_course_id — safe to re-call).
//     2. If the journey is brand new (no missions yet), seed it with the
//        3 hardcoded missions and all 16 hardcoded plants automatically.
//
//   Returns the first journey's id as journeyId (matches existing contract).
//
// HOW TO ACTIVATE:
//   1. Run supabase/schema.sql in the Supabase SQL Editor.
//   2. Rename this file to route.ts (delete the Prisma route.ts first).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { HARDCODED_MISSIONS } from '@/lib/hardcoded-missions';

interface Course {
  id:       string;
  name:     string;
  section?: string | null;
}

export async function POST(req: NextRequest) {
  let body: { teacherId?: string; courses?: Course[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { teacherId, courses = [] } = body;
  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
  }
  if (courses.length === 0) {
    return NextResponse.json({ error: 'at least one course required' }, { status: 400 });
  }

  let firstJourneyId: string | null = null;

  for (const course of courses) {
    // ── Upsert journey ────────────────────────────────────────────────────────
    // onConflict: 'google_course_id' means re-connecting the same course is safe.
    const { data: journey, error: journeyError } = await supabaseAdmin
      .from('journeys')
      .upsert(
        { google_course_id: course.id, title: course.name, teacher_id: teacherId },
        { onConflict: 'google_course_id' },
      )
      .select('id')
      .single();

    if (journeyError || !journey) {
      console.error('[teacher/connect] upsert journey', course.id, journeyError);
      continue;
    }

    const journeyId = journey.id as string;
    if (!firstJourneyId) firstJourneyId = journeyId;

    // ── Seed if brand-new ─────────────────────────────────────────────────────
    // Count existing missions. If zero, this is a fresh journey — seed it.
    const { count } = await supabaseAdmin
      .from('missions')
      .select('id', { count: 'exact', head: true })
      .eq('journey_id', journeyId);

    if ((count ?? 0) === 0) {
      await seedJourney(journeyId, teacherId);
      console.log(`[teacher/connect] seeded journey ${journeyId} for course "${course.name}"`);
    }
  }

  if (!firstJourneyId) {
    return NextResponse.json({ error: 'Failed to create any journeys' }, { status: 500 });
  }

  // Match the exact response shape the frontend expects.
  return NextResponse.json({ ok: true, journeyId: firstJourneyId });
}

// -----------------------------------------------------------------------------
// seedJourney — inserts 3 hardcoded missions + all plants for a new journey.
// Runs missions one at a time (sequential) so the plants FK is always satisfied.
// -----------------------------------------------------------------------------
async function seedJourney(journeyId: string, teacherId: string): Promise<void> {
  for (const missionSeed of HARDCODED_MISSIONS) {
    const { data: mission, error: missionError } = await supabaseAdmin
      .from('missions')
      .insert({
        journey_id:           journeyId,
        mission_order:        missionSeed.mission_order,
        question:             missionSeed.question,
        question_description: missionSeed.question_description,
        project_title:        missionSeed.project_title,
        project_description:  missionSeed.project_description,
        opening_message:      missionSeed.opening_message,
        state:                'locked',
        source:               'HARDCODED',
        created_by:           teacherId,
      })
      .select('id')
      .single();

    if (missionError || !mission) {
      console.error('[seedJourney] insert mission', missionSeed.mission_order, missionError);
      continue;
    }

    const { error: plantsError } = await supabaseAdmin
      .from('plants')
      .insert(
        missionSeed.plants.map(p => ({
          mission_id:      mission.id,
          title:           p.title,
          label:           p.label,
          content:         p.content,
          opening_message: p.opening_message,
          source:          'HARDCODED',
          created_by:      teacherId,
        })),
      );

    if (plantsError) {
      console.error('[seedJourney] insert plants for mission', mission.id, plantsError);
    }
  }
}
