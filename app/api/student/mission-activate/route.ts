// PATCH /api/student/mission-activate
//
// Allows a child in a family class to self-activate a locked mission.
// Only valid for classes with type = 'family'. One mission active at a time.
//
// Request:  PATCH { classId: string, missionId: string }
// Response: 200 { ok: true, state: 'active' }
//           400 — missing fields
//           401 — no session
//           403 — not a student / not enrolled / not a family class
//           404 — mission not found or doesn't belong to this class
//           409 — another mission is already active

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, resolveStudentId } from '@/lib/auth';
import { z, parseBody } from '@/lib/validate';

const Schema = z.object({
  classId:   z.string().min(1, 'classId required'),
  missionId: z.string().min(1, 'missionId required'),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const studentId = await resolveStudentId(auth.user);
  if (!studentId) {
    return NextResponse.json({ error: 'Forbidden: student session required' }, { status: 403 });
  }

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.response;
  const { classId, missionId } = parsed.data;

  // Verify class exists and is a family class
  const { data: klass } = await supabaseAdmin
    .from('classes')
    .select('id, journey_id, type')
    .eq('id', classId)
    .maybeSingle();

  if (!klass) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  if (klass.type !== 'family') {
    return NextResponse.json({ error: 'Forbidden: mission self-activation is only available in family classes' }, { status: 403 });
  }

  // Verify student is enrolled in this class
  const { data: enrollment } = await supabaseAdmin
    .from('student_classes')
    .select('student_id')
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (!enrollment) {
    return NextResponse.json({ error: 'Forbidden: not enrolled in this class' }, { status: 403 });
  }

  // Verify the mission belongs to this class's journey
  const { data: mission } = await supabaseAdmin
    .from('missions')
    .select('id, journey_id')
    .eq('id', missionId)
    .maybeSingle();

  if (!mission || mission.journey_id !== klass.journey_id) {
    return NextResponse.json({ error: 'Mission not found in this class' }, { status: 404 });
  }

  // Enforce one-active-at-a-time
  const { data: activeMission } = await supabaseAdmin
    .from('class_mission_state')
    .select('mission_id')
    .eq('class_id', classId)
    .eq('state', 'active')
    .maybeSingle();

  if (activeMission) {
    return NextResponse.json({ error: 'Another mission is already active' }, { status: 409 });
  }

  // Activate the mission
  const { error: upsertError } = await supabaseAdmin
    .from('class_mission_state')
    .upsert(
      { class_id: classId, mission_id: missionId, state: 'active' },
      { onConflict: 'class_id,mission_id' },
    );

  if (upsertError) {
    console.error('[student/mission-activate]', upsertError);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, state: 'active' });
}
