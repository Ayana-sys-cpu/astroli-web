// =============================================================================
// /api/teacher/connect
//
// POST { courses: { id: string; name: string; section?: string }[], curriculumJourneyId: string }
//
// The teacher is already in Supabase by the time this is called — the
// identify route upserts the teacher row during sign-in.
// This route only handles the course → journey step:
//
//   For each course:
//     1. Upsert a journey row (keyed by google_course_id — safe to re-call).
//     2. If the journey is brand new (no missions yet), copy missions + planets
//        from the selected curriculum template journey.
//
// Returns the first journey's id as journeyId (matches existing contract).
//
// teacherId is taken from the session — the body's teacherId field is ignored.
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

  // Verify the curriculum journey exists
  const { data: curriculum, error: currErr } = await supabaseAdmin
    .from('journeys')
    .select('id, title')
    .eq('id', curriculumJourneyId)
    .is('google_course_id', null)   // safety: only templates have no course id
    .single();

  if (currErr || !curriculum) {
    return NextResponse.json({ error: 'Curriculum journey not found' }, { status: 400 });
  }

  let firstJourneyId: string | null = null;
  let lastJourneyError: unknown = null;

  for (const course of courses) {
    const normCourseId = normaliseCourseId(course.id);

    // ── Insert or fetch journey ───────────────────────────────────────────────
    // On first connect: INSERT with curriculum_journey_id set.
    // On reconnect:     INSERT fails (unique conflict) → SELECT the existing row
    //                   and UPDATE only title/teacher_id — never overwriting
    //                   curriculum_journey_id so the seeded missions stay linked
    //                   to their original curriculum.
    let journeyId: string;

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('journeys')
      .insert({
        google_course_id:      normCourseId,
        title:                 course.name,
        teacher_id:            teacherId,
        curriculum_journey_id: curriculumJourneyId,
      })
      .select('id')
      .single();

    if (insertErr) {
      // Conflict — journey already exists. Refresh mutable fields only.
      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('journeys')
        .select('id')
        .eq('google_course_id', normCourseId)
        .single();

      if (fetchErr || !existing) {
        console.error('[teacher/connect] fetch existing journey failed', course.id, fetchErr);
        lastJourneyError = fetchErr;
        continue;
      }

      // Update title + teacher_id in case they changed; leave curriculum_journey_id alone.
      await supabaseAdmin
        .from('journeys')
        .update({ title: course.name, teacher_id: teacherId })
        .eq('id', existing.id);

      journeyId = existing.id as string;
    } else if (!inserted) {
      console.error('[teacher/connect] insert returned no data', course.id);
      lastJourneyError = new Error('No data from insert');
      continue;
    } else {
      journeyId = inserted.id as string;
    }

    if (!firstJourneyId) firstJourneyId = journeyId;

    // ── Seed if brand-new ─────────────────────────────────────────────────────
    const { count, error: countErr } = await supabaseAdmin
      .from('missions')
      .select('id', { count: 'exact', head: true })
      .eq('journey_id', journeyId);

    if (countErr) {
      // If the count query fails we cannot safely determine whether the journey
      // is new — skip seeding to avoid duplicating missions on reconnect.
      console.error('[teacher/connect] mission count query failed, skipping seed', countErr);
      continue;
    }

    if ((count ?? 0) === 0) {
      try {
        await copyFromCurriculum(journeyId, curriculumJourneyId, teacherId);
        console.log(`[teacher/connect] seeded journey ${journeyId} from curriculum "${curriculum.title}"`);
      } catch (seedErr) {
        const detail = seedErr instanceof Error ? seedErr.message : String(seedErr);
        console.error('[teacher/connect] seeding failed, rolling back journey upsert', detail);
        // Delete the empty journey so reconnect can retry cleanly
        await supabaseAdmin.from('journeys').delete().eq('id', journeyId);
        return NextResponse.json({ error: 'Failed to seed journey from curriculum. Please try again.' }, { status: 500 });
      }
    }
  }

  if (!firstJourneyId) {
    const detail = lastJourneyError instanceof Error
      ? lastJourneyError.message
      : JSON.stringify(lastJourneyError);
    console.error('[teacher/connect] all journey upserts failed. Last error:', detail);
    return NextResponse.json({ error: 'Failed to create any journeys' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, journeyId: firstJourneyId });
}

// -----------------------------------------------------------------------------
// copyFromCurriculum — copies all missions and planets from a curriculum
// template journey into a new class journey.
// Throws if any mission fails to copy so the caller can surface the error.
// -----------------------------------------------------------------------------
async function copyFromCurriculum(
  classJourneyId:      string,
  curriculumJourneyId: string,
  teacherId:           string,
): Promise<void> {
  const { data: missions, error: fetchErr } = await supabaseAdmin
    .from('missions')
    .select('*')
    .eq('journey_id', curriculumJourneyId)
    .order('order');

  if (fetchErr) throw new Error(`Failed to fetch curriculum missions: ${fetchErr.message}`);

  for (const m of (missions ?? [])) {
    const { data: newMission, error: mErr } = await supabaseAdmin
      .from('missions')
      .insert({
        journey_id:           classJourneyId,
        order:                m.order,
        state:                'locked',
        question:             m.question,
        question_description: m.question_description,
        mission_brief:        m.mission_brief,
        chapter:              m.chapter,
        project_title:        m.project_title,
        project_description:  m.project_description,
        opening_message:       m.opening_message,
        opening_quick_replies: m.opening_quick_replies,
        opening_message_2:     m.opening_message_2,
        world_brief_summary:   m.world_brief_summary,
        world_brief_items:     m.world_brief_items,
        qa_answers:            m.qa_answers,
        mission_qa_answers:    m.mission_qa_answers,
        source:                'HARDCODED',
        created_by:            teacherId,
      })
      .select('id')
      .single();

    if (mErr || !newMission) {
      throw new Error(`Failed to copy mission order ${m.order}: ${mErr?.message ?? 'no data returned'}`);
    }

    const { data: planets } = await supabaseAdmin
      .from('planets')
      .select('*')
      .eq('mission_id', m.id);

    if (planets && planets.length > 0) {
      const { error: pErr } = await supabaseAdmin
        .from('planets')
        .insert(
          planets.map(p => ({
            mission_id:            newMission.id,
            icon:                  p.icon,
            label:                 p.label,
            title:                 p.title,
            short_title:           p.short_title,
            hint:                  p.hint,
            character_figure:      p.character_figure,
            character_year:        p.character_year,
            character_location:    p.character_location,
            content:               p.content,
            planet_question:       p.planet_question,
            opening_message:        p.opening_message,
            opening_quick_replies:  p.opening_quick_replies,
            student_reveal_message: p.student_reveal_message,
            source:                 'HARDCODED',
            created_by:             teacherId,
          })),
        );

      if (pErr) {
        console.error('[copyFromCurriculum] insert planets for mission', newMission.id, pErr);
      }
    }
  }
}
