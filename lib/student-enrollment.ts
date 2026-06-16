import { supabaseAdmin } from './supabase-server';

/**
 * Resolves the class IDs a student is enrolled in (`student_classes`).
 *
 * Self-healing fallback: GC course-matching can silently produce zero
 * enrollments when the student isn't formally in the teacher's GC classroom,
 * the GC API errored, or the class has no google_course_id (manual setup).
 * When that happens, enroll the student in any class with a currently open
 * vote. This is a plain insert, not an upsert — `student_classes`'s only
 * uniqueness guard is a *partial* unique index (`student_classes_one_per_template`,
 * `WHERE template_journey_id IS NOT NULL`), and PostgREST's upsert
 * `onConflict` target can't match a partial index. Two concurrent requests
 * can both observe zero enrollments and both attempt this insert; the loser
 * hits a unique-violation (Postgres code 23505), which we treat as "someone
 * else's request already enrolled this student" and recover from by
 * re-reading the row instead of swallowing it into an empty result.
 */
export async function resolveEnrolledClassIds(studentId: string): Promise<string[]> {
  const { data: enrollments } = await supabaseAdmin
    .from('student_classes')
    .select('class_id')
    .eq('student_id', studentId);

  const classIds = (enrollments ?? [])
    .map((e: any) => e.class_id)
    .filter((id: unknown): id is string => Boolean(id));

  if (classIds.length > 0) return classIds;

  const now = new Date().toISOString();
  const { data: openVoteSession } = await supabaseAdmin
    .from('vote_sessions')
    .select('class_id')
    .eq('status', 'open')
    .gt('ends_at', now)
    .not('class_id', 'is', null)
    .limit(1)
    .maybeSingle();

  const fallbackClassId = (openVoteSession as any)?.class_id ?? null;
  if (!fallbackClassId) return [];

  const { data: fallbackClass } = await supabaseAdmin
    .from('classes')
    .select('id, journey_id')
    .eq('id', fallbackClassId)
    .maybeSingle();

  if (!fallbackClass) return [];

  const { error: enrollErr } = await supabaseAdmin
    .from('student_classes')
    .insert({
      student_id:          studentId,
      class_id:             (fallbackClass as any).id,
      template_journey_id:  (fallbackClass as any).journey_id,
    });

  if (enrollErr) {
    // 23505 = unique_violation — a concurrent request already inserted this
    // student's enrollment for this template between our read and write.
    // Re-read rather than returning [] and stranding the student on
    // /pending-journey despite being enrolled.
    if ((enrollErr as any).code === '23505') {
      const { data: retried } = await supabaseAdmin
        .from('student_classes')
        .select('class_id')
        .eq('student_id', studentId);
      return (retried ?? [])
        .map((e: any) => e.class_id)
        .filter((id: unknown): id is string => Boolean(id));
    }
    console.error('[resolveEnrolledClassIds] fallback enroll failed:', enrollErr);
    return [];
  }

  return [(fallbackClass as any).id];
}
