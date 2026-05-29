// =============================================================================
// /api/teacher/connect
//
// POST { courses: { id: string; name: string }[] }
//
// The teacher is already in Supabase by the time this is called — the
// identify route upserts the teacher row during sign-in.
// This route only handles the course → journey step:
//
//   For each course:
//     1. Upsert a journey row (keyed by google_course_id — safe to re-call).
//     2. If the journey is brand new (no missions yet), seed it with the
//        3 hardcoded missions and all 16 hardcoded plants automatically.
//
// Returns the first journey's id as journeyId (matches existing contract).
//
// teacherId is taken from the session — the body's teacherId field is ignored.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { HARDCODED_MISSIONS } from '@/lib/hardcoded-missions';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
import { z, parseBody } from '@/lib/validate';

const ConnectSchema = z.object({
  courses: z.array(
    z.object({
      id:      z.string().trim().min(1, 'Course id is required'),
      name:    z.string().trim().min(1, 'Course name is required'),
      section: z.string().nullable().optional(),
    }),
  ).min(1, 'At least one course is required'),
});

type Course = z.infer<typeof ConnectSchema>['courses'][number];

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;

  const parsed = await parseBody(req, ConnectSchema);
  if (!parsed.ok) return parsed.response;
  const { courses } = parsed.data;

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
