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
//           409 — another mission is active and not yet fully explored
//
// An active mission whose planets the student has all explored no longer
// blocks: it is retired to 'completed' here, on the way into the new pick.
// This is the only place a family mission transitions active → completed.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, resolveStudentId } from '@/lib/auth';
import { isMissionFullyExplored } from '@/lib/student-home';
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

  // Enforce one-active-at-a-time — unless the active mission is already fully
  // explored by this student, in which case retire it to 'completed' and let
  // the new pick proceed.
  const { data: activeMission } = await supabaseAdmin
    .from('class_mission_state')
    .select('mission_id')
    .eq('class_id', classId)
    .eq('state', 'active')
    .maybeSingle();

  if (activeMission) {
    const { data: planetRows } = await supabaseAdmin
      .from('planets')
      .select('id')
      .eq('mission_id', activeMission.mission_id);
    const planetIds = (planetRows ?? []).map((p: { id: string }) => p.id);

    const { data: exploredRows } = await supabaseAdmin
      .from('planet_session_state')
      .select('planet_id')
      .eq('student_id', studentId)
      .eq('completed', true)
      .in('planet_id', planetIds.length > 0 ? planetIds : ['__none__']);
    const exploredPlanetIds = new Set((exploredRows ?? []).map((r: { planet_id: string }) => r.planet_id));

    if (!isMissionFullyExplored(planetIds, exploredPlanetIds)) {
      return NextResponse.json({ error: 'Another mission is already active' }, { status: 409 });
    }

    const { error: completeError } = await supabaseAdmin
      .from('class_mission_state')
      .update({ state: 'completed' })
      .eq('class_id', classId)
      .eq('mission_id', activeMission.mission_id);

    if (completeError) {
      console.error('[student/mission-activate] failed to complete finished mission:', completeError);
      return NextResponse.json({ error: completeError.message }, { status: 500 });
    }
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
