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

  // Fetch all missions for this journey
  const { data: missions, error } = await supabaseAdmin
    .from('missions')
    .select('id, question, project_title, translations, "order"')
    .eq('journey_id', klass.journey_id)
    .order('"order"');

  if (error) {
    console.error('[student/family-missions]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch mission states for this class
  const missionIds = (missions ?? []).map((m: any) => m.id);
  const { data: stateRows } = await supabaseAdmin
    .from('class_mission_state')
    .select('mission_id, state')
    .eq('class_id', classId)
    .in('mission_id', missionIds.length > 0 ? missionIds : ['__none__']);

  const stateByMission = new Map(
    (stateRows ?? []).map((r: any) => [r.mission_id, r.state as string]),
  );

  const lang: 'en' | 'he' = klass.language === 'he' ? 'he' : 'en';

  return NextResponse.json({
    language: lang,
    missions: (missions ?? []).map((m: any) => {
      const translations = (m.translations as Record<string, Record<string, string>> | null) ?? {};
      const tx = translations[lang] ?? {};
      const rawTitle = m.question ?? m.project_title ?? 'Mission';
      const title = tx.question ?? tx.project_title ?? rawTitle;
      return {
        id:    m.id,
        title,
        state: stateByMission.get(m.id) ?? 'locked',
        order: m.order,
      };
    }),
  });
}
