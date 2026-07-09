import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { resolveEnrolledClassIds } from '@/lib/student-enrollment';

// GET /api/student/journey
//
// Returns current routing state for the authenticated student, scoped to a
// single class:
//   hasActiveJourney — any mission is 'active' in the scoped class → /landscape
//   hasActiveVote    — an open vote_session (ends_at in the future), or a
//                       concluded one with a pending_start winner → /vote
//   both false       — /home (or /pending-journey, with zero enrollments)
//
// ?classId= scopes every query to one enrolled class — /vote and /landscape
// pass the classId from their own URL. If omitted, falls back to the
// student's first enrolled class (legacy single-class behavior, kept so
// nothing else breaks mid-rollout to multi-journey).
//
// The ?studentId= query param is intentionally ignored — identity comes from
// the verified session cookie only.
export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const enrolledClassIds = await resolveEnrolledClassIds(studentId);
    if (enrolledClassIds.length === 0) {
      return NextResponse.json({ hasActiveJourney: false, hasActiveVote: false });
    }

    const requestedClassId = req.nextUrl.searchParams.get('classId');
    const classIds = requestedClassId
      ? (enrolledClassIds.includes(requestedClassId) ? [requestedClassId] : [])
      : enrolledClassIds;

    if (classIds.length === 0) {
      // Requested a class the student isn't enrolled in.
      return NextResponse.json({ hasActiveJourney: false, hasActiveVote: false });
    }

    // 1. Active mission check — only 'active' state counts as a launched mission.
    //    'pending_start' means vote is concluded but teacher hasn't activated yet;
    //    students should stay on the vote results screen until the teacher fires it.
    const { data: activeStateRow } = await supabaseAdmin
      .from('class_mission_state')
      .select('mission_id')
      .eq('state', 'active')
      .in('class_id', classIds)
      .limit(1)
      .maybeSingle();

    if (activeStateRow) {
      const { data: ms } = await supabaseAdmin
        .from('mission_started_by_student')
        .select('status')
        .eq('student_id', studentId)
        .eq('mission_id', (activeStateRow as any).mission_id)
        .maybeSingle();
      const missionStatus = (ms as any)?.status ?? null;
      return NextResponse.json({
        hasActiveJourney: true,
        hasActiveVote:    false,
        activeMissionId:  (activeStateRow as any).mission_id,
        missionStatus,
      });
    }

    // 2. Active vote check — open session whose end time is still in the future.
    const now = new Date().toISOString();
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('vote_sessions')
      .select('id, ends_at, class_id')
      .eq('status', 'open')
      .gt('ends_at', now)
      .in('class_id', classIds)
      .limit(1)
      .maybeSingle();

    if (sessionErr) console.error('[journey] vote session query error:', sessionErr);

    if (session) {
      const { data: stateRows } = await supabaseAdmin
        .from('class_mission_state')
        .select('mission_id, state')
        .eq('class_id', (session as any).class_id)
        .in('state', ['voting', 'locked']);

      const missionIds = (stateRows ?? []).map((r: any) => r.mission_id);
      const stateByMission = new Map((stateRows ?? []).map((r: any) => [r.mission_id, r.state]));

      const { data: missionData } = await supabaseAdmin
        .from('missions')
        .select('id, question, project_title, project_description, "order", language, translations')
        .in('id', missionIds)
        .order('"order"');

      const voteMissions = (missionData ?? []).map((m: any) => {
        const tx = m.language === 'he' ? (m.translations?.he ?? {}) : {};
        return {
          id:                 m.id,
          question:           tx.question ?? m.question,
          projectTitle:       tx.project_title ?? m.project_title,
          projectDescription: m.project_description,
          order:              m.order,
          state:              stateByMission.get(m.id),
        };
      });

      return NextResponse.json({
        hasActiveJourney: false,
        hasActiveVote:    true,
        language:         ((missionData?.[0] as any)?.language === 'he' ? 'he' : 'en') as 'en' | 'he',
        voteSessionId:    (session as any).id,
        voteJourneyId:    (session as any).class_id,
        voteEndsAt:       (session as any).ends_at,
        voteMissions,
      });
    }

    // 3. Awaiting activation — vote concluded, winner is pending_start.
    //    Student stays on the vote page seeing results until teacher activates.
    const { data: pendingStateRow } = await supabaseAdmin
      .from('class_mission_state')
      .select('class_id, mission_id')
      .eq('state', 'pending_start')
      .in('class_id', classIds)
      .limit(1)
      .maybeSingle();

    if (pendingStateRow) {
      const pendingClassId = (pendingStateRow as any).class_id;
      const { data: allStateRows } = await supabaseAdmin
        .from('class_mission_state')
        .select('mission_id, state')
        .eq('class_id', pendingClassId)
        .in('state', ['pending_start', 'skipped']);

      const missionIds = (allStateRows ?? []).map((r: any) => r.mission_id);
      const stateByMission = new Map((allStateRows ?? []).map((r: any) => [r.mission_id, r.state]));

      const { data: allMissionData } = await supabaseAdmin
        .from('missions')
        .select('id, question, project_title, project_description, "order", language, translations')
        .in('id', missionIds)
        .order('"order"');

      const { data: concludedSession } = await supabaseAdmin
        .from('vote_sessions')
        .select('id')
        .eq('class_id', pendingClassId)
        .eq('status', 'concluded')
        .order('ends_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const voteMissions = (allMissionData ?? []).map((m: any) => {
        const tx = m.language === 'he' ? (m.translations?.he ?? {}) : {};
        return {
          id:                 m.id,
          question:           tx.question ?? m.question,
          projectTitle:       tx.project_title ?? m.project_title,
          projectDescription: m.project_description,
          order:              m.order,
          state:              stateByMission.get(m.id),
        };
      });

      return NextResponse.json({
        hasActiveJourney:   false,
        hasActiveVote:      true,
        awaitingActivation: true,
        language:           ((allMissionData?.[0] as any)?.language === 'he' ? 'he' : 'en') as 'en' | 'he',
        voteSessionId:      (concludedSession as any)?.id ?? null,
        voteJourneyId:      pendingClassId,
        voteEndsAt:         null,
        voteMissions,
      });
    }

    return NextResponse.json({
      hasActiveJourney: false,
      hasActiveVote:    false,
      journeyId:        classIds[0] ?? null,
    });
  } catch (err) {
    console.error('[GET /api/student/journey]', err);
    return NextResponse.json({ hasActiveJourney: false, hasActiveVote: false });
  }
}

// PATCH /api/student/journey
// Body: { missionId: string, status: string }
// Upserts the authenticated student's status for a specific mission.
// The body's studentId field is intentionally ignored — identity comes from
// the verified session cookie only.
export async function PATCH(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { missionId, status = 'started' } = await req.json();
    if (!missionId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from('mission_started_by_student')
      .upsert(
        { student_id: studentId, mission_id: missionId, status, updated_at: new Date().toISOString() },
        { onConflict: 'student_id,mission_id' },
      );
    if (error) {
      console.error('[PATCH /api/student/journey]', error);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/student/journey]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
