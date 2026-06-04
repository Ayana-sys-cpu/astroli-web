import { supabaseAdmin } from '@/lib/supabase-server';

/** Normalise a Google Classroom course ID to its canonical numeric form. */
function normaliseCourseId(id: string): string {
  if (/^[0-9]+$/.test(id)) return id;
  try {
    const decoded = Buffer.from(id, 'base64').toString('utf8');
    if (/^[0-9]+$/.test(decoded)) return decoded;
  } catch {}
  return id;
}

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

  // 2. Find journeys that match those course IDs.
  // If courseIds is empty (student has no GC courses), currentJourneyIds will
  // be empty and all existing enrollments will be removed below.
  let currentJourneyIds: string[] = [];
  if (courseIds.length > 0) {
    const { data: journeys, error } = await supabaseAdmin
      .from('journeys')
      .select('id')
      .in('google_course_id', courseIds);

    if (error) {
      console.error('[enroll] journeys lookup failed:', error);
      return;
    }
    currentJourneyIds = (journeys ?? []).map((j) => j.id);
  }

  // 3. Upsert new enrollments.
  if (currentJourneyIds.length > 0) {
    const { error: upsertError } = await supabaseAdmin
      .from('student_journeys')
      .upsert(
        currentJourneyIds.map((id) => ({ student_id: studentId, journey_id: id })),
        { onConflict: 'student_id,journey_id', ignoreDuplicates: true },
      );
    if (upsertError) {
      console.error('[enroll] upsert student_journeys failed:', upsertError);
      return;
    }
    console.log(`[enroll] enrolled student ${studentId} in ${currentJourneyIds.length} journey(s)`);
  }

  // 4. Remove stale enrollments — journeys the student is no longer part of.
  //
  // GUARD: only run cleanup when we have a confirmed list of matching journeys.
  // If currentJourneyIds is empty it means GC returned courses but none matched
  // any journey in the DB (e.g. GC course not yet linked, or student is in a
  // different school's GC). Treating all existing enrollments as "stale" in this
  // case would delete manually-inserted or previously valid enrollments — wrong.
  if (currentJourneyIds.length === 0) {
    console.log(`[enroll] no journey matches for student ${studentId} — preserving existing enrollments`);
    return;
  }

  const { data: existing } = await supabaseAdmin
    .from('student_journeys')
    .select('journey_id')
    .eq('student_id', studentId);

  const stale = (existing ?? [])
    .map((r) => r.journey_id)
    .filter((id) => !currentJourneyIds.includes(id));

  if (stale.length > 0) {
    const { error: deleteError } = await supabaseAdmin
      .from('student_journeys')
      .delete()
      .eq('student_id', studentId)
      .in('journey_id', stale);
    if (deleteError) {
      console.error('[enroll] remove stale enrollments failed:', deleteError);
    } else {
      console.log(`[enroll] removed ${stale.length} stale enrollment(s) for student ${studentId}`);
    }
  }
}
