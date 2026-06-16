import { supabaseAdmin } from './supabase-server';

/**
 * Resolves the class IDs a student is enrolled in (`student_classes`).
 *
 * Self-healing fallback: GC course-matching can silently produce zero
 * enrollments when the student isn't formally in the teacher's GC classroom,
 * the GC API errored, or the class has no google_course_id (manual setup).
 * When that happens, enroll the student in any class with a currently open
 * vote — idempotent (a plain insert, safe because we already know there are
 * zero enrollment rows for this student at this point).
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
    console.error('[resolveEnrolledClassIds] fallback enroll failed:', enrollErr);
    return [];
  }

  return [(fallbackClass as any).id];
}
