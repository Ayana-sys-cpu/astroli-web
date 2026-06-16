// =============================================================================
// /api/teacher/connect
//
// POST { courses: { id: string; name: string; section?: string }[], curriculumJourneyId: string }
//
// The teacher is already in Supabase by the time this is called — the
// identify route upserts the teacher row during sign-in.
// This route only handles the course → class step:
//
//   For each course:
//     1. Upsert a `classes` row (keyed by google_course_id — safe to re-call),
//        pointing at the selected curriculum journey (template). The template
//        is never copied — classes only ever reference it.
//     2. Seed one class_mission_state row per template mission, defaulting to
//        'locked', using ON CONFLICT DO NOTHING so re-calling this is safe
//        even under concurrent/duplicate requests.
//
// Returns the first class's id as journeyId (matches existing contract — the
// field name stays journeyId for backward compatibility with the frontend
// that calls this route; it is a class id now, not a journey id).
//
// teacherId is taken from the session — the body's teacherId field is ignored.
//
// See docs/architecture/2026-06-16-journeys-classes-redesign.md for the full
// rationale behind this split.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
import { z, parseBody } from '@/lib/validate';
import { normaliseCourseId } from '@/lib/normalise-course-id';

const ConnectSchema = z.object({
  courses: z.array(
    z.object({
      id:      z.string().trim().min(1, 'Course id is required'),
      name:    z.string().trim().min(1, 'Course name is required'),
      section: z.string().nullable().optional(),
    }),
  ).min(1, 'At least one course is required'),
  curriculumJourneyId: z.string().uuid('Invalid curriculum journey id'),
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
  const { courses, curriculumJourneyId } = parsed.data;

  // Verify the curriculum journey exists. journeys are template-only now —
  // there is no google_course_id check needed since that column no longer
  // exists on journeys (it lives on classes instead).
  const { data: curriculum, error: currErr } = await supabaseAdmin
    .from('journeys')
    .select('id, title')
    .eq('id', curriculumJourneyId)
    .single();

  if (currErr || !curriculum) {
    return NextResponse.json({ error: 'Curriculum journey not found' }, { status: 400 });
  }

  let firstClassId: string | null = null;
  let lastClassError: unknown = null;

  for (const course of courses) {
    const normCourseId = normaliseCourseId(course.id);

    // ── Insert or fetch class ─────────────────────────────────────────────────
    // On first connect: INSERT with journey_id set.
    // On reconnect:     INSERT fails (unique conflict) → SELECT the existing row
    //                   and UPDATE only title/teacher_id — never overwriting
    //                   journey_id, which is immutable after creation (see
    //                   design doc §3.3 — the one-class-per-template-per-student
    //                   constraint depends on a class's template never changing).
    let classId: string;

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('classes')
      .insert({
        google_course_id: normCourseId,
        title:            course.name,
        teacher_id:       teacherId,
        journey_id:       curriculumJourneyId,
      })
      .select('id')
      .single();

    if (insertErr) {
      // Conflict — class already exists. Refresh mutable fields only.
      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('classes')
        .select('id')
        .eq('google_course_id', normCourseId)
        .single();

      if (fetchErr || !existing) {
        console.error('[teacher/connect] fetch existing class failed', course.id, fetchErr);
        lastClassError = fetchErr;
        continue;
      }

      // Update title + teacher_id in case they changed; leave journey_id alone.
      await supabaseAdmin
        .from('classes')
        .update({ title: course.name, teacher_id: teacherId })
        .eq('id', existing.id);

      classId = existing.id as string;
    } else if (!inserted) {
      console.error('[teacher/connect] insert returned no data', course.id);
      lastClassError = new Error('No data from insert');
      continue;
    } else {
      classId = inserted.id as string;
    }

    if (!firstClassId) firstClassId = classId;

    // ── Seed class_mission_state ──────────────────────────────────────────────
    // One row per template mission, defaulting to locked. ON CONFLICT DO
    // NOTHING makes this idempotent on reconnect — no count-then-act race.
    try {
      await seedClassMissionState(classId, curriculumJourneyId);
    } catch (seedErr) {
      const detail = seedErr instanceof Error ? seedErr.message : String(seedErr);
      console.error('[teacher/connect] seeding class_mission_state failed', detail);
      // Only roll back the class if it was newly created this call — never
      // delete a pre-existing class on a reconnect failure.
      if (insertErr === null) {
        await supabaseAdmin.from('classes').delete().eq('id', classId);
      }
      return NextResponse.json({ error: 'Failed to set up class missions. Please try again.' }, { status: 500 });
    }
  }

  if (!firstClassId) {
    const detail = lastClassError instanceof Error
      ? lastClassError.message
      : JSON.stringify(lastClassError);
    console.error('[teacher/connect] all class upserts failed. Last error:', detail);
    return NextResponse.json({ error: 'Failed to create any classes' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, journeyId: firstClassId });
}

// -----------------------------------------------------------------------------
// seedClassMissionState — inserts one class_mission_state row (state: 'locked')
// per mission belonging to the curriculum template, skipping any that already
// exist. Safe to call repeatedly (reconnect, or a template gaining missions
// after the class was created — see design doc §3.2).
// -----------------------------------------------------------------------------
async function seedClassMissionState(
  classId:             string,
  curriculumJourneyId: string,
): Promise<void> {
  const { data: missions, error: fetchErr } = await supabaseAdmin
    .from('missions')
    .select('id')
    .eq('journey_id', curriculumJourneyId);

  if (fetchErr) throw new Error(`Failed to fetch curriculum missions: ${fetchErr.message}`);
  if (!missions || missions.length === 0) return;

  const { error: insertErr } = await supabaseAdmin
    .from('class_mission_state')
    .upsert(
      missions.map(m => ({ class_id: classId, mission_id: m.id, state: 'locked' })),
      { onConflict: 'class_id,mission_id', ignoreDuplicates: true },
    );

  if (insertErr) throw new Error(`Failed to seed class_mission_state: ${insertErr.message}`);
}
