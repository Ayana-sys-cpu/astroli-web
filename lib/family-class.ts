import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * One-per-template rule: the partial unique index `student_classes_one_per_template`
 * on (student_id, template_journey_id) means a child can hold only one class —
 * school or family — per journey template. Product decision (family-track spec):
 * school and family tracks stay separate, so a parent cannot start a family class
 * on a journey their child already studies elsewhere; they pick a different one.
 *
 * Shared by POST /api/parent/family-class (onboarding) and POST /api/parent/journeys
 * (adding another journey) so both report the conflict with one error contract.
 */

export async function childAlreadyEnrolledOnTemplate(
  childId: string,
  templateJourneyId: string,
): Promise<boolean> {
  const { data: enrollment } = await supabaseAdmin
    .from('student_classes')
    .select('id')
    .eq('student_id', childId)
    .eq('template_journey_id', templateJourneyId)
    .maybeSingle();

  return Boolean(enrollment);
}

export function enrollmentConflictResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'Your child is already enrolled in this journey in another class — pick a different journey.',
      code:  'child_already_enrolled',
    },
    { status: 409 },
  );
}

export type FamilyClassEnrollResult =
  | { ok: true }
  | { ok: false; conflict: boolean };

/**
 * Enrolls the child in a just-created family class. On failure the class is
 * deleted again (the caller created it moments ago and it has no other members),
 * so a parent never ends up owning a class their child is not in.
 *
 * A unique violation (23505) means something enrolled the child on this template
 * between the caller's conflict check and this insert — reported as `conflict`
 * so callers answer exactly like an upfront conflict.
 */
export async function enrollChildInFamilyClass(args: {
  childId: string;
  classId: string;
  templateJourneyId: string;
}): Promise<FamilyClassEnrollResult> {
  const { childId, classId, templateJourneyId } = args;

  const { error: enrollError } = await supabaseAdmin
    .from('student_classes')
    .insert({ student_id: childId, class_id: classId, template_journey_id: templateJourneyId });

  if (!enrollError) return { ok: true };

  await supabaseAdmin.from('classes').delete().eq('id', classId);

  if ((enrollError as { code?: string }).code === '23505') {
    return { ok: false, conflict: true };
  }
  console.error('[family-class] enrollment error:', enrollError);
  return { ok: false, conflict: false };
}
