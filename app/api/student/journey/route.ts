import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, assertStudentSession } from '@/lib/auth';

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

  const sessionError = assertStudentSession(auth.user);
  if (sessionError) return sessionError;

  const studentId = auth.user.user_metadata.student_id as string;

  try {
    // Resolve enrolled journey IDs for this student.
    const { data: enrollments } = await supabaseAdmin
      .from('student_journeys')
      .select('journey_id')
      .eq('student_id', studentId);

    const enrolledJourneyIds = (enrollments ?? []).map((e) => e.journey_id);

    if (enrolledJourneyIds.length === 0) {
      return NextResponse.json({ hasActiveJourney: false, hasActiveVote: false });
    }

    // 1. Active mission check — scoped to enrolled journeys.
    const { data: activeMission } = await supabaseAdmin
      .from('missions')
      .select('id')
      .in('state', ['active', 'pending_start'])
      .in('journey_id', enrolledJourneyIds)
      .limit(1)
      .maybeSingle();

    if (activeMission) {
      const { data: ms } = await supabaseAdmin
        .from('mission_started_by_student')
        .select('status')
        .eq('student_id', studentId)
        .eq('mission_id', activeMission.id)
        .maybeSingle();
      const missionStatus = (ms as any)?.status ?? null;
      return NextResponse.json({
        hasActiveJourney: true,
        hasActiveVote:    false,
        activeMissionId:  activeMission.id,
        missionStatus,
      });
    }

    // 2. Active vote check — open session whose end time is still in the future.
    const now = new Date().toISOString();
    const { data: session } = await supabaseAdmin
      .from('vote_sessions')
      .select('id, ends_at, journey_id')
      .eq('status', 'open')
      .gt('ends_at', now)
      .in('journey_id', enrolledJourneyIds)
      .limit(1)
      .maybeSingle();

    if (session) {
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

    return NextResponse.json({
      hasActiveJourney: false,
      hasActiveVote:    false,
      journeyId:        enrolledJourneyIds[0] ?? null,
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

  const sessionError = assertStudentSession(auth.user);
  if (sessionError) return sessionError;

  const studentId = auth.user.user_metadata.student_id as string;

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
