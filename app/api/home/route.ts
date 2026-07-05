import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { resolveStudentIdFromRequest } from '@/lib/auth';

// GET /api/home
//
// Returns the classes the authenticated student is enrolled in, each with
// its template's missions and that class's live state.
//
// The response's `id` field is a classes.id (kept as the JSON key the
// frontend already expects — see docs/architecture/2026-06-16-journeys-classes-redesign.md).
// missions/planets are owned exclusively by the template now, never
// duplicated, so they're fetched via class.journey_id and joined against
// class_mission_state for this specific class's progress.
//
// The ?studentId= query param is intentionally ignored — identity comes from
// the verified web session cookie, or a DB-validated x-student-id header (mobile).
export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Fetch the classes the student is enrolled in.
    const { data: enrollments, error: eErr } = await supabaseAdmin
      .from('student_classes')
      .select('class_id')
      .eq('student_id', studentId);

    if (eErr) throw eErr;

    const classIds = (enrollments ?? []).map((e) => e.class_id).filter((id): id is string => Boolean(id));

    if (classIds.length === 0) {
      return NextResponse.json({ journeys: [] });
    }

    const { data: classes, error: cErr } = await supabaseAdmin
      .from('classes')
      .select('id, title, journey_id, language')
      .in('id', classIds);

    if (cErr) throw cErr;
    if (!classes || classes.length === 0) {
      return NextResponse.json({ journeys: [] });
    }

    const journeyIds = classes.map((c) => c.journey_id);

    const [{ data: missionRows, error: mErr }, { data: stateRows }, { data: openSessions }, { data: studentCompletions }] = await Promise.all([
      supabaseAdmin
        .from('missions')
        .select('id, journey_id, question, "order", translations')
        .in('journey_id', journeyIds),
      supabaseAdmin
        .from('class_mission_state')
        .select('class_id, mission_id, state')
        .in('class_id', classIds),
      supabaseAdmin
        .from('vote_sessions')
        .select('class_id, ends_at')
        .in('class_id', classIds)
        .eq('status', 'open'),
      // Per-student mission completion — set by the bot when all planets done.
      // Used to show "done" for this student even while the class is still active.
      supabaseAdmin
        .from('mission_started_by_student')
        .select('mission_id, status')
        .eq('student_id', studentId)
        .eq('status', 'completed'),
    ]);

    if (mErr) throw mErr;

    const missionsByJourney = new Map<string, typeof missionRows>();
    for (const m of missionRows ?? []) {
      const list = missionsByJourney.get(m.journey_id) ?? [];
      list.push(m);
      missionsByJourney.set(m.journey_id, list);
    }

    const stateByClassAndMission = new Map((stateRows ?? []).map((r) => [`${r.class_id}:${r.mission_id}`, r.state]));
    const voteEndsAtByClass = new Map((openSessions ?? []).map((s) => [s.class_id, s.ends_at]));
    const studentCompletedMissions = new Set((studentCompletions ?? []).map((s) => s.mission_id));

    const journeys = classes.map((c) => {
      const lang = (c as any).language ?? 'en';
      return {
      id: c.id,
      title: c.title,
      voteEndsAt: voteEndsAtByClass.get(c.id) ?? null,
      missions: (missionsByJourney.get(c.journey_id) ?? [])
        .sort((a, b) => a.order - b.order)
        .map((m) => {
          const tx: Record<string, any> = lang === 'he'
            ? (((m as any).translations as Record<string, any>)?.he ?? {})
            : {};
          const classState = stateByClassAndMission.get(`${c.id}:${m.id}`) ?? 'locked';
          // If this student personally finished all planets while the class
          // is still active, surface "completed" so mobile shows "done".
          const effectiveState =
            classState === 'active' && studentCompletedMissions.has(m.id)
              ? 'completed'
              : classState;
          return {
            id: m.id,
            question: tx.question ?? m.question,
            state: effectiveState,
            order: m.order,
          };
        }),
      };
    });

    return NextResponse.json({ journeys });
  } catch (err) {
    console.error('[GET /api/home]', err);
    return NextResponse.json({ journeys: [] });
  }
}
