import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, resolveStudentId } from '@/lib/auth';

// GET /api/student/journey
//
// Returns current routing state for the authenticated student:
//   hasActiveJourney — any mission is 'active' in an enrolled journey → /landscape
//   hasActiveVote    — an open vote_session exists with ends_at in the future → /vote
//   both false       → /pending-journey
//
// The ?studentId= query param is intentionally ignored — identity comes from
// the verified session cookie only.
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const studentId = await resolveStudentId(auth.user);
  if (!studentId) {
    return NextResponse.json({ error: 'Forbidden: student session required' }, { status: 403 });
  }

  try {
    // Resolve enrolled classes for this student.
    const { data: enrollments } = await supabaseAdmin
      .from('student_journeys')
      .select('class_id')
      .eq('student_id', studentId);

    let enrolledClassIds = (enrollments ?? []).map((e) => e.class_id).filter((id): id is string => Boolean(id));
    console.log('[journey] studentId:', studentId, 'enrolledClasses:', enrolledClassIds);

    // ── Fallback enrollment ────────────────────────────────────────────────────
    // GC course-matching can silently produce zero enrollments when:
    //   • the student isn't formally in the teacher's GC classroom
    //   • the GC API returned an error or empty list at login time
    //   • the class has no google_course_id (direct/manual setup)
    //
    // Self-healing: if the student has no enrollments at all, find any class
    // that currently has an open vote and enroll them there. This is
    // idempotent (upsert) and safe for the current single-teacher MVP.
    if (enrolledClassIds.length === 0) {
      const now = new Date().toISOString();

      const { data: openVoteSession } = await supabaseAdmin
        .from('vote_sessions')
        .select('class_id')
        .eq('status', 'open')
        .gt('ends_at', now)
        .not('class_id', 'is', null)
        .limit(1)
        .maybeSingle();

      const fallbackClassId = openVoteSession?.class_id ?? null;

      if (fallbackClassId) {
        const { data: fallbackClass } = await supabaseAdmin
          .from('classes')
          .select('id, journey_id')
          .eq('id', fallbackClassId)
          .maybeSingle();

        if (fallbackClass) {
          const { error: enrollErr } = await supabaseAdmin
            .from('student_journeys')
            .upsert(
              {
                student_id:          studentId,
                journey_id:          fallbackClass.journey_id,
                class_id:            fallbackClass.id,
                template_journey_id: fallbackClass.journey_id,
              },
              { onConflict: 'student_id,journey_id', ignoreDuplicates: true },
            );
          if (enrollErr) {
            console.error('[GET /api/student/journey] fallback enroll failed:', enrollErr);
          } else {
            console.log(`[GET /api/student/journey] fallback-enrolled student ${studentId} in class ${fallbackClass.id}`);
            enrolledClassIds = [fallbackClass.id];
          }
        }
      }

      if (enrolledClassIds.length === 0) {
        return NextResponse.json({ hasActiveJourney: false, hasActiveVote: false });
      }
    }

    const { data: enrolledClasses } = await supabaseAdmin
      .from('classes')
      .select('id, journey_id')
      .in('id', enrolledClassIds);

    const journeyIdByClassId = new Map((enrolledClasses ?? []).map(c => [c.id, c.journey_id]));

    // 1. Active mission check — only 'active' state counts as a launched mission.
    //    'pending_start' means vote is concluded but teacher hasn't activated yet;
    //    students should stay on the vote results screen until the teacher fires it.
    const { data: activeStateRow } = await supabaseAdmin
      .from('class_mission_state')
      .select('mission_id')
      .eq('state', 'active')
      .in('class_id', enrolledClassIds)
      .limit(1)
      .maybeSingle();

    if (activeStateRow) {
      const { data: ms } = await supabaseAdmin
        .from('mission_started_by_student')
        .select('status')
        .eq('student_id', studentId)
        .eq('mission_id', activeStateRow.mission_id)
        .maybeSingle();
      const missionStatus = (ms as any)?.status ?? null;
      return NextResponse.json({
        hasActiveJourney: true,
        hasActiveVote:    false,
        activeMissionId:  activeStateRow.mission_id,
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
      .in('class_id', enrolledClassIds)
      .limit(1)
      .maybeSingle();

    if (sessionErr) console.error('[journey] vote session query error:', sessionErr);
    console.log('[journey] vote session check — found:', session ? `id=${session.id} ends_at=${session.ends_at}` : 'none', 'classIds:', enrolledClassIds, 'now:', now);
    if (session) {
      const sessionJourneyId = journeyIdByClassId.get(session.class_id!);
      const { data: stateRows } = await supabaseAdmin
        .from('class_mission_state')
        .select('mission_id, state')
        .eq('class_id', session.class_id!)
        .in('state', ['voting', 'locked']);

      const missionIds = (stateRows ?? []).map(r => r.mission_id);
      const stateByMission = new Map((stateRows ?? []).map(r => [r.mission_id, r.state]));

      const { data: missionData } = await supabaseAdmin
        .from('missions')
        .select('id, question, project_title, project_description, "order"')
        .in('id', missionIds)
        .order('"order"');

      const voteMissions = (missionData ?? []).map((m: any) => ({
        id:                 m.id,
        question:           m.question,
        projectTitle:       m.project_title,
        projectDescription: m.project_description,
        order:              (m as any).order,
        state:              stateByMission.get(m.id),
      }));

      return NextResponse.json({
        hasActiveJourney: false,
        hasActiveVote:    true,
        voteSessionId:    session.id,
        voteJourneyId:    session.class_id,
        voteEndsAt:       session.ends_at,
        voteMissions,
      });
    }

    // 3. Awaiting activation — vote concluded, winner is pending_start.
    //    Student stays on the vote page seeing results until teacher activates.
    const { data: pendingStateRow } = await supabaseAdmin
      .from('class_mission_state')
      .select('class_id, mission_id')
      .eq('state', 'pending_start')
      .in('class_id', enrolledClassIds)
      .limit(1)
      .maybeSingle();

    if (pendingStateRow) {
      const pendingClassId = pendingStateRow.class_id;
      const { data: allStateRows } = await supabaseAdmin
        .from('class_mission_state')
        .select('mission_id, state')
        .eq('class_id', pendingClassId)
        .in('state', ['pending_start', 'skipped']);

      const missionIds = (allStateRows ?? []).map(r => r.mission_id);
      const stateByMission = new Map((allStateRows ?? []).map(r => [r.mission_id, r.state]));

      const { data: allMissionData } = await supabaseAdmin
        .from('missions')
        .select('id, question, project_title, project_description, "order"')
        .in('id', missionIds)
        .order('"order"');

      // Also retrieve the concluded session so vote counts can still be displayed.
      const { data: concludedSession } = await supabaseAdmin
        .from('vote_sessions')
        .select('id')
        .eq('class_id', pendingClassId)
        .eq('status', 'concluded')
        .order('ends_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const voteMissions = (allMissionData ?? []).map((m: any) => ({
        id:                 m.id,
        question:           m.question,
        projectTitle:       m.project_title,
        projectDescription: m.project_description,
        order:              (m as any).order,
        state:              stateByMission.get(m.id),
      }));

      return NextResponse.json({
        hasActiveJourney:   false,
        hasActiveVote:      true,
        awaitingActivation: true,
        voteSessionId:      concludedSession?.id ?? null,
        voteJourneyId:      pendingClassId,
        voteEndsAt:         null,
        voteMissions,
      });
    }

    return NextResponse.json({
      hasActiveJourney: false,
      hasActiveVote:    false,
      journeyId:        enrolledClassIds[0] ?? null,
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
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const studentId = await resolveStudentId(auth.user);
  if (!studentId) {
    return NextResponse.json({ error: 'Forbidden: student session required' }, { status: 403 });
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
