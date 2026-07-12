// GET /api/student/family-missions?classId=<id>
//
// Returns all missions for a family class with their current state,
// so the child can pick one to activate. Only works for type='family' classes.
//
// Response: 200 { missions: [{ id, title, state, order }] }
//           400 — missing classId
//           401 — no session
//           403 — not a student / not enrolled / not a family class

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, resolveStudentId } from '@/lib/auth';
import { isMissionFullyExplored } from '@/lib/student-home';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const studentId = await resolveStudentId(auth.user);
  if (!studentId) {
    return NextResponse.json({ error: 'Forbidden: student session required' }, { status: 403 });
  }

  const classId = req.nextUrl.searchParams.get('classId');
  if (!classId) {
    return NextResponse.json({ error: 'classId is required' }, { status: 400 });
  }

  // Verify class exists and is a family class
  const { data: klass } = await supabaseAdmin
    .from('classes')
    .select('id, journey_id, type, language')
    .eq('id', classId)
    .maybeSingle();

  if (!klass || klass.type !== 'family') {
    return NextResponse.json({ error: 'Forbidden: not a family class' }, { status: 403 });
  }

  // Verify enrollment
  const { data: enrollment } = await supabaseAdmin
    .from('student_classes')
    .select('student_id')
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (!enrollment) {
    return NextResponse.json({ error: 'Forbidden: not enrolled in this class' }, { status: 403 });
  }

  // Fetch all missions for this journey (planets embedded for the
  // per-student completion check below)
  const { data: missions, error } = await supabaseAdmin
    .from('missions')
    .select('id, question, project_title, translations, "order", planets(id)')
    .eq('journey_id', klass.journey_id)
    .order('"order"');

  if (error) {
    console.error('[student/family-missions]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch mission states for this class + the planets this student explored
  const missionIds = (missions ?? []).map((m: any) => m.id);
  const [{ data: stateRows }, { data: completedPlanetRows }] = await Promise.all([
    supabaseAdmin
      .from('class_mission_state')
      .select('mission_id, state')
      .eq('class_id', classId)
      .in('mission_id', missionIds.length > 0 ? missionIds : ['__none__']),
    supabaseAdmin
      .from('planet_session_state')
      .select('planet_id')
      .eq('student_id', studentId)
      .eq('completed', true),
  ]);

  const stateByMission = new Map(
    (stateRows ?? []).map((r: any) => [r.mission_id, r.state as string]),
  );
  const exploredPlanetIds = new Set(
    (completedPlanetRows ?? []).map((r: any) => r.planet_id as string),
  );

  const lang: 'en' | 'he' = klass.language === 'he' ? 'he' : 'en';

  return NextResponse.json({
    language: lang,
    missions: (missions ?? []).map((m: any) => {
      const translations = (m.translations as Record<string, Record<string, string>> | null) ?? {};
      const tx = translations[lang] ?? {};
      const rawTitle = m.question ?? m.project_title ?? 'Mission';
      const title = tx.question ?? tx.project_title ?? rawTitle;
      // Per-student view, mirroring /api/student/home: an active mission whose
      // planets this student has all explored is completed for them, so the
      // picker shows it dimmed instead of offering it as a selectable world.
      const classState = stateByMission.get(m.id) ?? 'locked';
      const planetIds = ((m.planets ?? []) as { id: string }[]).map((p) => p.id);
      const studentFinished = classState === 'active'
        && isMissionFullyExplored(planetIds, exploredPlanetIds);
      return {
        id:    m.id,
        title,
        state: studentFinished ? 'completed' : classState,
        order: m.order,
      };
    }),
  });
}
