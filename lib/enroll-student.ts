import { supabaseAdmin } from '@/lib/supabase-server';
import { normaliseCourseId } from '@/lib/normalise-course-id';

/**
 * Enrolls a student in all Astroli journeys that match their Google Classroom courses.
 *
 * Called on every sign-in (idempotent upsert) so the enrollment stays current
 * without a separate background sync job.
 *
 * Fails silently — if GC is unreachable or returns an error status, the function
 * returns early without touching existing enrollments. Only a successful GC response
 * (with a confirmed course list) triggers the stale-enrollment cleanup in Step 4.
 */
export async function enrollStudentInJourneys(
  studentId: string,
  accessToken: string,
): Promise<void> {
  // 1. Ask Google Classroom which courses this student is in.
  let courseIds: string[] = [];
  try {
    const res = await fetch(
      'https://classroom.googleapis.com/v1/courses?studentId=me&courseStates=ACTIVE',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (res.ok) {
      const data = await res.json();
      courseIds = (data.courses ?? []).map((c: any) => normaliseCourseId(String(c.id)));
      // If the student has no GC courses, treat the same as an API error —
      // return early so Step 4 does not delete manually-inserted enrollments
      // (e.g. test accounts or students not yet in any active classroom).
      if (courseIds.length === 0) {
        console.log('[enroll] student has no active GC courses — skipping enrollment sync');
        return;
      }
    } else {
      // Do not fall through — Step 4 would treat all existing enrollments as stale
      // and delete them if courseIds remains empty. Return early instead.
      console.log('[enroll] GC API returned', res.status, '— skipping enrollment');
      return;
    }
  } catch (err) {
    console.log('[enroll] GC unreachable — skipping enrollment:', err);
    return;
  }

  // 2. Find classes that match those course IDs.
  // google_course_id now lives on `classes` (a teacher's instance of a
  // curriculum journey), not on `journeys` (which is template-only) — see
  // docs/architecture/2026-06-16-journeys-classes-redesign.md.
  // If courseIds is empty (student has no GC courses), currentClasses will
  // be empty and all existing enrollments will be removed below.
  let currentClasses: { id: string; journey_id: string }[] = [];
  if (courseIds.length > 0) {
    const { data: classes, error } = await supabaseAdmin
      .from('classes')
      .select('id, journey_id')
      .in('google_course_id', courseIds);

    if (error) {
      console.error('[enroll] classes lookup failed:', error);
      return;
    }
    currentClasses = classes ?? [];
  }

  // 3. Insert new enrollments.
  //
  // student_classes (renamed from student_journeys by the classes-split
  // cleanup migration) has no unique constraint that ON CONFLICT can target —
  // its one-per-template rule is a partial unique index, which Postgres can
  // only use as an upsert arbiter when the predicate is restated, and
  // Supabase's REST upsert doesn't support that. So this checks for an
  // existing (student_id, class_id) row first and only inserts if absent —
  // idempotent across repeated sign-ins without relying on ON CONFLICT.
  if (currentClasses.length > 0) {
    for (const c of currentClasses) {
      const { data: existingRow } = await supabaseAdmin
        .from('student_classes')
        .select('id')
        .eq('student_id', studentId)
        .eq('class_id', c.id)
        .maybeSingle();
      if (existingRow) continue;

      const { error: insertError } = await supabaseAdmin
        .from('student_classes')
        .insert({
          student_id:          studentId,
          class_id:            c.id,
          template_journey_id: c.journey_id,
        });
      if (insertError) {
        // A unique-violation here most likely means the student already has a
        // class on this same template (the constraint working as designed) —
        // not every conflict is an error worth surfacing loudly.
        console.error('[enroll] insert student_classes failed:', insertError);
      }
    }
    console.log(`[enroll] enrolled student ${studentId} in ${currentClasses.length} class(es)`);
  }

  // 4. Remove stale enrollments — classes the student is no longer part of.
  //
  // GUARD: only run cleanup when we have a confirmed list of matching classes.
  // If currentClasses is empty it means GC returned courses but none matched
  // any class in the DB (e.g. GC course not yet connected by its teacher, or
  // student is in a different school's GC). Treating all existing enrollments
  // as "stale" in this case would delete manually-inserted or previously
  // valid enrollments — wrong.
  if (currentClasses.length === 0) {
    console.log(`[enroll] no class matches for student ${studentId} — preserving existing enrollments`);
    return;
  }

  const currentClassIds = currentClasses.map((c) => c.id);

  const { data: existing } = await supabaseAdmin
    .from('student_classes')
    .select('class_id')
    .eq('student_id', studentId);

  const stale = (existing ?? [])
    .map((r) => r.class_id)
    .filter((id): id is string => Boolean(id) && !currentClassIds.includes(id as string));

  if (stale.length > 0) {
    const { error: deleteError } = await supabaseAdmin
      .from('student_classes')
      .delete()
      .eq('student_id', studentId)
      .in('class_id', stale);
    if (deleteError) {
      console.error('[enroll] remove stale enrollments failed:', deleteError);
    } else {
      console.log(`[enroll] removed ${stale.length} stale enrollment(s) for student ${studentId}`);
    }
  }
}
