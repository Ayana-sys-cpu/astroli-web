import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, resolveStudentId } from '@/lib/auth';
import { resolveEnrolledClassIds } from '@/lib/student-enrollment';
import { buildHomeJourney, isMissionFullyExplored, type HomeJourney, type MissionSummary } from '@/lib/student-home';
import { resolveUserLanguage } from '@/lib/student-language';

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

  // firstName is returned so the greeting reads from the database rather than
  // whatever was cached in localStorage at signup. Without it, a name corrected
  // after the student first logged in would never reach their device.
  const [classIds, { data: parentLink }, { data: me }] = await Promise.all([
    resolveEnrolledClassIds(studentId),
    supabaseAdmin.from('parent_child_link').select('parent_id').eq('child_id', studentId).maybeSingle(),
    supabaseAdmin.from('users').select('first_name').eq('id', studentId).maybeSingle(),
  ]);
  const hasParent = !!parentLink;
  const firstName = (me?.first_name as string | null) ?? null;

  if (classIds.length === 0) {
    return NextResponse.json({ journeys: [], hasParent, firstName });
  }

  const { data: classes } = await supabaseAdmin
    .from('classes')
    .select('id, title, journey_id, teacher_id, language, type')
    .in('id', classIds);

  if (!classes || classes.length === 0) {
    return NextResponse.json({ journeys: [], hasParent, firstName });
  }

  const journeyIds = Array.from(new Set(classes.map((c: any) => c.journey_id)));
  const teacherIds = Array.from(new Set(classes.map((c: any) => c.teacher_id)));

  // Planets come embedded on missions, and the student's completed planets are
  // fetched by student alone (not filtered to the active missions' planet ids),
  // so both can join this batch instead of running as two sequential round-trips
  // afterwards. The intersection happens in memory below.
  const [
    { data: teacherRows },
    { data: missionRows },
    { data: stateRows },
    { data: voteSessionRows },
    { data: completedPlanetRows },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('id, name').in('id', teacherIds.length > 0 ? teacherIds : ['__none__']),
    supabaseAdmin.from('missions').select('id, journey_id, question, project_title, language, "order", translations->he, planets(id)').in('journey_id', journeyIds).order('"order"'),
    supabaseAdmin.from('class_mission_state').select('class_id, mission_id, state').in('class_id', classIds),
    supabaseAdmin.from('vote_sessions').select('id, class_id, ends_at').eq('status', 'open').in('class_id', classIds),
    supabaseAdmin.from('planet_session_state').select('planet_id').eq('student_id', studentId).eq('completed', true),
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

  const planetsByMission = new Map<string, string[]>(
    (missionRows ?? []).map((m: any) => [m.id, ((m.planets ?? []) as any[]).map((p) => p.id as string)]),
  );

  const exploredPlanetIds = new Set(
    (completedPlanetRows ?? []).map((s: any) => s.planet_id),
  );

  const activeMissionIdByClass = new Map<string, string>();
  for (const c of classes as any[]) {
    const missions = missionsByJourney.get(c.journey_id) ?? [];
    const active = missions.find((m: any) => stateByClassAndMission.get(`${c.id}:${m.id}`) === 'active');
    if (active) activeMissionIdByClass.set(c.id, active.id);
  }

  const journeys: HomeJourney[] = (classes as any[]).map((c) => {
    const missions = missionsByJourney.get(c.journey_id) ?? [];
    const missionStates = missions.map((m: any) => ({
      state: stateByClassAndMission.get(`${c.id}:${m.id}`) ?? 'locked',
    }));

    const activeMissionId = activeMissionIdByClass.get(c.id) ?? null;
    let activeMission = null;
    const classLanguage: 'en' | 'he' = (c as any).language === 'he' ? 'he' : 'en';
    if (activeMissionId) {
      const mission = missions.find((m: any) => m.id === activeMissionId);
      const tx = classLanguage === 'he' ? ((mission?.he as Record<string, string> | null) ?? {}) : {};
      const rawTitle = mission?.project_title ?? mission?.question ?? 'Mission';
      const title = tx.question ?? tx.project_title ?? rawTitle;
      const planetIds = planetsByMission.get(activeMissionId) ?? [];
      activeMission = {
        id:              activeMissionId,
        title,
        planetsTotal:    planetIds.length,
        planetsExplored: planetIds.filter((id) => exploredPlanetIds.has(id)).length,
      };
    }

    const completedMissionsCount = missionStates.filter((s) => s.state === 'completed').length;
    const openVoteSessionRow = voteSessionByClass.get(c.id) ?? null;

    const allMissions: MissionSummary[] = missions.map((m: any) => {
      const tx = classLanguage === 'he' ? ((m.he as Record<string, string> | null) ?? {}) : {};
      const rawTitle = (m.project_title ?? m.question ?? 'Mission') as string;
      // Per-student view: an active mission whose planets this student has all
      // explored is already "completed" for them (teal + reviewable on the
      // orbit), even before the class-level state row is retired.
      const classState = (stateByClassAndMission.get(`${c.id}:${m.id}`) ?? 'locked') as MissionSummary['state'];
      const studentFinished = classState === 'active'
        && isMissionFullyExplored(planetsByMission.get(m.id) ?? [], exploredPlanetIds);
      return {
        id:          m.id as string,
        title:       (tx.question ?? tx.project_title ?? rawTitle) as string,
        question:    (tx.question ?? m.question ?? undefined) as string | undefined,
        state:       studentFinished ? 'completed' : classState,
        order:       m.order as number,
        planetCount: (planetsByMission.get(m.id) ?? []).length,
      };
    });

    return buildHomeJourney({
      classId:       c.id,
      className:     c.title,
      teacherName:   teacherNameById.get(c.teacher_id) ?? null,
      language:      classLanguage,
      isFamilyClass: (c as any).type === 'family',
      missionStates,
      openVoteSession: openVoteSessionRow
        ? { id: (openVoteSessionRow as any).id, endsAt: (openVoteSessionRow as any).ends_at }
        : null,
      activeMission,
      completedMissionsCount,
      allMissions,
    });
  });

  // Top-level `language` is the PERSON's, distinct from each journey's own —
  // it drives the chrome (header, curiosity panel, Orin) on a page that spans
  // every journey. The page used to take `journeys[0].language`, i.e. whichever
  // journey happened to sort first. See specs/shared/language/spec.md.
  const language = await resolveUserLanguage(studentId);

  return NextResponse.json({ journeys, hasParent, firstName, language });
}
