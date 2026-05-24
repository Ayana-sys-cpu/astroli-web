import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/student/journey?studentId=<uuid>
//
// Returns current routing state for the student:
//   hasActiveJourney — any mission is 'active' in an enrolled journey → /landscape
//   hasActiveVote    — an open vote_session exists with ends_at in the future → /vote
//   both false       → /pending-journey
//
// studentId is optional for backwards compatibility with legacy callers that
// don't pass it — in that case the global check (all journeys) is used.
export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get('studentId');

    // Resolve enrolled journey IDs if studentId is provided.
    let enrolledJourneyIds: string[] | null = null;
    if (studentId) {
      const { data: enrollments } = await supabaseAdmin
        .from('student_journeys')
        .select('journey_id')
        .eq('student_id', studentId);

      enrolledJourneyIds = (enrollments ?? []).map((e) => e.journey_id);

      // No enrollments yet — student hasn't been placed in any class.
      if (enrolledJourneyIds.length === 0) {
        return NextResponse.json({ hasActiveJourney: false, hasActiveVote: false });
      }
    }

    // 1. Active mission check — scoped to enrolled journeys when studentId provided.
    let missionQuery = supabaseAdmin
      .from('missions')
      .select('id')
      .eq('state', 'active')
      .limit(1);

    if (enrolledJourneyIds !== null) {
      missionQuery = missionQuery.in('journey_id', enrolledJourneyIds);
    }

    const { data: activeMission } = await missionQuery.maybeSingle();

    if (activeMission) {
      let missionStatus: string | null = null;
      if (studentId) {
        const { data: ms } = await supabaseAdmin
          .from('mission_started_by_student')
          .select('status')
          .eq('student_id', studentId)
          .eq('mission_id', activeMission.id)
          .maybeSingle();
        missionStatus = (ms as any)?.status ?? null;
      }
      return NextResponse.json({
        hasActiveJourney: true,
        hasActiveVote: false,
        activeMissionId: activeMission.id,
        missionStatus,
      });
    }

    // 2. Active vote check — open session whose end time is still in the future.
    const now = new Date().toISOString();
    let sessionQuery = supabaseAdmin
      .from('vote_sessions')
      .select('id, ends_at, journey_id')
      .eq('status', 'open')
      .gt('ends_at', now)
      .limit(1);

    if (enrolledJourneyIds !== null) {
      sessionQuery = sessionQuery.in('journey_id', enrolledJourneyIds);
    }

    const { data: session } = await sessionQuery.maybeSingle();

    if (session) {
      // Fetch voting missions for this session's journey.
      const { data: missionData } = await supabaseAdmin
        .from('missions')
        .select('id, question, project_title, project_description, mission_order, state')
        .eq('journey_id', session.journey_id)
        .in('state', ['voting', 'locked'])
        .order('mission_order');

      const voteMissions = (missionData ?? []).map((m: any) => ({
        id:                 m.id,
        question:           m.question,
        projectTitle:       m.project_title,
        projectDescription: m.project_description,
        order:              m.mission_order,
      }));

      return NextResponse.json({
        hasActiveJourney: false,
        hasActiveVote:    true,
        voteSessionId:    session.id,
        voteJourneyId:    session.journey_id,
        voteEndsAt:       session.ends_at,
        voteMissions,
      });
    }

    return NextResponse.json({ hasActiveJourney: false, hasActiveVote: false });
  } catch (err) {
    console.error('[GET /api/student/journey]', err);
    return NextResponse.json({ hasActiveJourney: false, hasActiveVote: false });
  }
}

// PATCH /api/student/journey
// Body: { studentId: string, missionId: string, status: string }
// Upserts the student's status for a specific mission.
export async function PATCH(req: NextRequest) {
  try {
    const { studentId, missionId, status = 'started' } = await req.json();
    if (!studentId || !missionId) {
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
