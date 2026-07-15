// POST /api/parent/family-class
//
// Creates a family class (class-of-one) and enrolls the child.
// Mirrors the teacher connect flow but without Google Classroom.
//
// Request:  POST { journeyId: string }
// Response: 200 { ok: true, classId: string }
//           401 — no session
//           403 — not a parent session / no linked child
//           409 — child already holds a class on this journey template
//                 (code: 'child_already_enrolled' — school and family classes
//                 can't coexist on one template)
//           422 — journeyId not found

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { resolveParentId } from '@/lib/parent-auth';
import {
  childAlreadyEnrolledOnTemplate,
  enrollChildInFamilyClass,
  enrollmentConflictResponse,
} from '@/lib/family-class';
import { z, parseBody } from '@/lib/validate';

const Schema = z.object({
  journeyId: z.string().min(1, 'journeyId required'),
  language:  z.enum(['en', 'he']).default('en'),
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
  const { journeyId, language } = parsed.data;

  // Verify journey template exists
  const { data: journey } = await supabaseAdmin
    .from('journeys')
    .select('id, title')
    .eq('id', journeyId)
    .maybeSingle();

  if (!journey) {
    return NextResponse.json({ error: 'Journey not found' }, { status: 422 });
  }

  // If the child is already linked (invite already accepted) they are enrolled
  // right after class creation — but not if they already hold a class on this
  // journey template (e.g. a school class): block before creating anything, so
  // the parent never ends up with a class their child is not in.
  const { data: link } = await supabaseAdmin
    .from('parent_child_link')
    .select('child_id')
    .eq('parent_id', parentId)
    .maybeSingle();

  if (link && await childAlreadyEnrolledOnTemplate(link.child_id, journeyId)) {
    return enrollmentConflictResponse();
  }

  // Create family class — teacher_id is the parent's users.id.
  // Child enrollment is deferred when there is no link yet: the invite hasn't
  // been accepted, so there is no child to enroll. accept-invite will
  // auto-enroll the child when they accept (see /api/auth/accept-invite).
  const { data: newClass, error: classError } = await supabaseAdmin
    .from('classes')
    .insert({
      journey_id: journeyId,
      teacher_id: parentId,
      title:      journey.title,
      type:       'family',
      language,
      // google_course_id deliberately omitted (NULL) for family classes
    })
    .select('id')
    .single();

  if (classError || !newClass) {
    console.error('[parent/family-class] insert class error:', classError);
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }

  if (link) {
    const enrolled = await enrollChildInFamilyClass({
      childId:           link.child_id,
      classId:           newClass.id,
      templateJourneyId: journeyId,
    });

    if (!enrolled.ok) {
      return enrolled.conflict
        ? enrollmentConflictResponse()
        : NextResponse.json({ error: 'Failed to enroll child' }, { status: 500 });
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
