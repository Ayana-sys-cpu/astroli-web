// Demo-class enrollment for brand-new mobile sign-ups.
//
// Students created straight from a sign-in (Apple or Google) are enrolled in
// the demo class so their first session shows a real journey instead of an
// empty home — App Review signs in with a fresh account and must land in a
// fully working app (guideline 2.2). Same class the reviewer demo account uses.

import { supabaseAdmin } from '@/lib/supabase-server';

export const DEMO_CLASS_ID = 'dededede-0000-4000-8000-000000000001';
export const DEMO_CLASS_JOURNEY_ID = '98581683-3601-48af-90cf-1ac5a6338b2b';

/**
 * Enrolls a brand-new student in the demo class. Best-effort: a failure
 * leaves them with an empty (but working) home, never blocks sign-in.
 * student_classes' one-per-template rule is a partial unique index that
 * ON CONFLICT can't target, so 23505 is swallowed (same as enroll-student).
 */
export async function enrollStudentInDemoClass(studentId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('student_classes').insert({
    student_id: studentId,
    class_id: DEMO_CLASS_ID,
    template_journey_id: DEMO_CLASS_JOURNEY_ID,
  });
  if (error && (error as { code?: string }).code !== '23505') {
    console.error('[demo-class] enrollment failed:', error);
  }
}
