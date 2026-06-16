import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, resolveStudentId } from '@/lib/auth';
import { resolveEnrolledClassIds } from '@/lib/student-enrollment';
import { buildHomeJourney, type HomeJourney } from '@/lib/student-home';

// GET /api/student/home
//
// Returns one entry per class the student is enrolled in, each with its
// derived status (live/voting/pending/done/idle) and the state-specific
// payload its home-screen card needs. See
// docs/superpowers/specs/2026-06-16-student-multi-journey-home-design.md.
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const studentId = await resolveStudentId(auth.user);
  if (!studentId) {
    return NextResponse.json({ error: 'Forbidden: student session required' }, { status: 403 });
  }

  const classIds = await resolveEnrolledClassIds(studentId);
  if (classIds.length === 0) {
    return NextResponse.json({ journeys: [] });
  }

  const { data: classes } = await supabaseAdmin
    .from('classes')
    .select('id, title, journey_id, teacher_id')
    .in('id', classIds);

  if (!classes || classes.length === 0) {
    return NextResponse.json({ journeys: [] });
  }

  const journeyIds = Array.from(new Set(classes.map((c: any) => c.journey_id)));
  const teacherIds = Array.from(new Set(classes.map((c: any) => c.teacher_id)));

  const [
    { data: teacherRows },
    { data: missionRows },
    { data: stateRows },
    { data: voteSessionRows },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('id, name').in('id', teacherIds.length > 0 ? teacherIds : ['__none__']),
    supabaseAdmin.from('missions').select('id, journey_id, question, project_title, "order"').in('journey_id', journeyIds),
    supabaseAdmin.from('class_mission_state').select('class_id, mission_id, state').in('class_id', classIds),
    supabaseAdmin.from('vote_sessions').select('id, class_id, ends_at').eq('status', 'open').in('class_id', classIds),
  ]);

  const teacherNameById = new Map((teacherRows ?? []).map((t: any) => [t.id, t.name as string | null]));

  const missionsByJourney = new Map<string, any[]>();
  for (const m of missionRows ?? []) {
    const list = missionsByJourney.get(m.journey_id) ?? [];
    list.push(m);
    missionsByJourney.set(m.journey_id, list);
  }

  const stateByClassAndMission = new Map((stateRows ?? []).map((r: any) => [`${r.class_id}:${r.mission_id}`, r.state]));
  const voteSessionByClass = new Map((voteSessionRows ?? []).map((s: any) => [s.class_id, s]));

  // Find each class's active mission (if any) so we can fetch planet counts
  // for just those missions in one batch, not once per class.
  const activeMissionIdByClass = new Map<string, string>();
  for (const c of classes as any[]) {
    const missions = missionsByJourney.get(c.journey_id) ?? [];
    const active = missions.find((m: any) => stateByClassAndMission.get(`${c.id}:${m.id}`) === 'active');
    if (active) activeMissionIdByClass.set(c.id, active.id);
  }
  const activeMissionIds = Array.from(new Set(activeMissionIdByClass.values()));

  const { data: planetRows } = await supabaseAdmin
    .from('planets')
    .select('id, mission_id')
    .in('mission_id', activeMissionIds.length > 0 ? activeMissionIds : ['__none__']);

  const planetsByMission = new Map<string, string[]>();
  for (const p of planetRows ?? []) {
    const list = planetsByMission.get(p.mission_id) ?? [];
    list.push(p.id);
    planetsByMission.set(p.mission_id, list);
  }

  const allPlanetIds = (planetRows ?? []).map((p: any) => p.id);
  const { data: summaryRows } = await supabaseAdmin
    .from('planet_summaries')
    .select('planet_id, status')
    .eq('student_id', studentId)
    .in('planet_id', allPlanetIds.length > 0 ? allPlanetIds : ['__none__']);

  const exploredPlanetIds = new Set(
    (summaryRows ?? []).filter((s: any) => s.status !== 'not_started').map((s: any) => s.planet_id),
  );

  const journeys: HomeJourney[] = (classes as any[]).map((c) => {
    const missions = missionsByJourney.get(c.journey_id) ?? [];
    const missionStates = missions.map((m: any) => ({
      state: stateByClassAndMission.get(`${c.id}:${m.id}`) ?? 'locked',
    }));

    const activeMissionId = activeMissionIdByClass.get(c.id) ?? null;
    let activeMission = null;
    if (activeMissionId) {
      const mission = missions.find((m: any) => m.id === activeMissionId);
      const planetIds = planetsByMission.get(activeMissionId) ?? [];
      activeMission = {
        id:              activeMissionId,
        title:           mission?.project_title ?? mission?.question ?? 'Mission',
        planetsTotal:    planetIds.length,
        planetsExplored: planetIds.filter((id) => exploredPlanetIds.has(id)).length,
      };
    }

    const completedMissionsCount = missionStates.filter((s) => s.state === 'completed').length;
    const openVoteSessionRow = voteSessionByClass.get(c.id) ?? null;

    return buildHomeJourney({
      classId:     c.id,
      className:   c.title,
      teacherName: teacherNameById.get(c.teacher_id) ?? null,
      missionStates,
      openVoteSession: openVoteSessionRow
        ? { id: (openVoteSessionRow as any).id, endsAt: (openVoteSessionRow as any).ends_at }
        : null,
      activeMission,
      completedMissionsCount,
    });
  });

  return NextResponse.json({ journeys });
}
