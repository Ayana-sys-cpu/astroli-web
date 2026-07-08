// POST /api/parent/family-class
//
// Creates a family class (class-of-one) and enrolls the child.
// Mirrors the teacher connect flow but without Google Classroom.
//
// Request:  POST { journeyId: string }
// Response: 200 { ok: true, classId: string }
//           401 — no session
//           403 — not a parent session / no linked child
//           409 — family class already exists for this parent
//           422 — journeyId not found

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { resolveParentId } from '@/lib/parent-auth';
import { z, parseBody } from '@/lib/validate';

const Schema = z.object({
  journeyId: z.string().min(1, 'journeyId required'),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parentId = resolveParentId(auth.user);
  if (!parentId) {
    return NextResponse.json({ error: 'Forbidden: parent session required' }, { status: 403 });
  }

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.response;
  const { journeyId } = parsed.data;

  // Verify journey template exists
  const { data: journey } = await supabaseAdmin
    .from('journeys')
    .select('id, title')
    .eq('id', journeyId)
    .maybeSingle();

  if (!journey) {
    return NextResponse.json({ error: 'Journey not found' }, { status: 422 });
  }

  // Check family class doesn't already exist
  const { data: existingClass } = await supabaseAdmin
    .from('classes')
    .select('id')
    .eq('teacher_id', parentId)
    .eq('type', 'family')
    .maybeSingle();

  if (existingClass) {
    return NextResponse.json({ error: 'Journey already selected and locked' }, { status: 409 });
  }

  // Verify parent has a linked child
  const { data: link } = await supabaseAdmin
    .from('parent_child_link')
    .select('child_id')
    .eq('parent_id', parentId)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ error: 'No linked child — invite must be accepted first' }, { status: 403 });
  }

  // Create family class — teacher_id is the parent's users.id
  const { data: newClass, error: classError } = await supabaseAdmin
    .from('classes')
    .insert({
      journey_id: journeyId,
      teacher_id: parentId,
      title:      journey.title,
      type:       'family',
      // google_course_id deliberately omitted (NULL) for family classes
    })
    .select('id')
    .single();

  if (classError || !newClass) {
    console.error('[parent/family-class] insert class error:', classError);
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }

  // Enroll child in the family class.
  // student_classes has no unique constraint on (student_id, class_id) — only a
  // partial unique index on (student_id, template_journey_id). PostgREST upsert
  // can't target a partial index, so we check-then-insert (same pattern as
  // lib/enroll-student.ts and lib/student-enrollment.ts).
  const { data: existingEnrollment } = await supabaseAdmin
    .from('student_classes')
    .select('id')
    .eq('student_id', link.child_id)
    .eq('class_id', newClass.id)
    .maybeSingle();

  if (!existingEnrollment) {
    const { error: enrollError } = await supabaseAdmin
      .from('student_classes')
      .insert({ student_id: link.child_id, class_id: newClass.id, template_journey_id: journeyId });

    if (enrollError && (enrollError as any).code !== '23505') {
      console.error('[parent/family-class] enrollment error:', enrollError);
      // Rollback the class
      await supabaseAdmin.from('classes').delete().eq('id', newClass.id);
      return NextResponse.json({ error: 'Failed to enroll child' }, { status: 500 });
    }
  }

  // Seed class_mission_state (all locked) — same logic as teacher/connect
  const { data: missions } = await supabaseAdmin
    .from('missions')
    .select('id')
    .eq('journey_id', journeyId);

  if (missions && missions.length > 0) {
    await supabaseAdmin
      .from('class_mission_state')
      .upsert(
        missions.map((m: { id: string }) => ({ class_id: newClass.id, mission_id: m.id, state: 'locked' })),
        { onConflict: 'class_id,mission_id', ignoreDuplicates: true },
      );
  }

  return NextResponse.json({ ok: true, classId: newClass.id });
}
