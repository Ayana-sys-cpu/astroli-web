// =============================================================================
// /api/teacher/journeys
//
// GET  — list all journeys for a teacher, each with its active vote session.
// PATCH — vote session state machine:
//   voteEndsAt set, no open session → INSERT vote_session + locked→voting
//   voteEndsAt set, session exists  → UPDATE session ends_at
//   voteEndsAt null                 → conclude active session + voting→locked
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// GET /api/teacher/journeys?teacherId=
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get('teacherId');
  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('journeys')
    .select(`
      id,
      title,
      google_course_id,
      missions (
        id,
        question,
        project_title,
        state,
        mission_order
      ),
      vote_sessions (
        id,
        starts_at,
        ends_at,
        status,
        winner_id
      )
    `)
    .eq('teacher_id', teacherId)
    .order('created_at')
    .order('mission_order', { referencedTable: 'missions' });

  if (error) {
    console.error('[GET /api/teacher/journeys]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const journeys = (data ?? []).map(j => {
    const sessions = (j.vote_sessions as any[]) ?? [];
    const activeSession = sessions.find((s: any) => s.status === 'open') ?? null;

    return {
      id:             j.id,
      title:          j.title,
      googleCourseId: j.google_course_id,
      activeVoteSession: activeSession
        ? { id: activeSession.id, startsAt: activeSession.starts_at, endsAt: activeSession.ends_at }
        : null,
      missions: (j.missions as any[]).map(m => ({
        id:           m.id,
        question:     m.question,
        projectTitle: m.project_title,
        state:        m.state,
        order:        m.mission_order,
      })),
    };
  });

  return NextResponse.json({ journeys });
}

// ---------------------------------------------------------------------------
// PATCH /api/teacher/journeys
// Body: { journeyId: string; voteEndsAt: string | null }
//
// voteEndsAt set:
//   - If an open session already exists → update its ends_at
//   - Otherwise → create a new session and transition locked→voting
// voteEndsAt null:
//   - Conclude the active session (status → 'concluded')
//   - Revert voting→locked (caller may then PATCH individual missions to
//     pending_start/skipped via /api/teacher/missions)
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  let body: { journeyId?: string; voteEndsAt?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { journeyId, voteEndsAt, voteStartsAt } = body as { journeyId?: string; voteEndsAt?: string | null; voteStartsAt?: string | null };
  if (!journeyId) {
    return NextResponse.json({ error: 'journeyId required' }, { status: 400 });
  }

  const parsedEndsAt   = voteEndsAt   ? new Date(voteEndsAt).toISOString()   : null;
  const parsedStartsAt = voteStartsAt ? new Date(voteStartsAt).toISOString() : null;

  if (parsedEndsAt) {
    // ── Opening or extending a vote ────────────────────────────────────────

    // Check if there's already an open session for this journey.
    const { data: existing } = await supabaseAdmin
      .from('vote_sessions')
      .select('id')
      .eq('journey_id', journeyId)
      .eq('status', 'open')
      .maybeSingle();

    let sessionId: string;

    if (existing) {
      // Update the end time of the existing session.
      const { data: updated, error } = await supabaseAdmin
        .from('vote_sessions')
        .update({ ends_at: parsedEndsAt })
        .eq('id', existing.id)
        .select('id, ends_at')
        .single();

      if (error) {
        console.error('[PATCH /api/teacher/journeys] update session', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      sessionId = updated.id;
    } else {
      // Create a new session and transition all locked missions to 'voting'.
      const { data: created, error: sessionError } = await supabaseAdmin
        .from('vote_sessions')
        .insert({ journey_id: journeyId, starts_at: parsedStartsAt, ends_at: parsedEndsAt, status: 'open' })
        .select('id, ends_at, starts_at')
        .single();

      if (sessionError) {
        console.error('[PATCH /api/teacher/journeys] create session', sessionError);
        return NextResponse.json({ error: sessionError.message }, { status: 500 });
      }
      sessionId = created.id;

      // Transition locked → voting so students are routed to /vote in real time.
      const { error: missionError } = await supabaseAdmin
        .from('missions')
        .update({ state: 'voting' })
        .eq('journey_id', journeyId)
        .eq('state', 'locked');

      if (missionError) {
        console.error('[PATCH /api/teacher/journeys] mission → voting', missionError);
        return NextResponse.json({ error: missionError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      journey: { id: journeyId },
      sessionId,
      sessionEndsAt:   parsedEndsAt,
      sessionStartsAt: parsedStartsAt,
    });

  } else {
    // ── Concluding a vote ──────────────────────────────────────────────────

    const { error: sessionError } = await supabaseAdmin
      .from('vote_sessions')
      .update({ status: 'concluded' })
      .eq('journey_id', journeyId)
      .eq('status', 'open');

    if (sessionError) {
      console.error('[PATCH /api/teacher/journeys] conclude session', sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // Revert voting missions to locked. The caller (handleFinishVote) will
    // then PATCH individual missions to pending_start / skipped as needed.
    const { error: missionError } = await supabaseAdmin
      .from('missions')
      .update({ state: 'locked' })
      .eq('journey_id', journeyId)
      .eq('state', 'voting');

    if (missionError) {
      console.error('[PATCH /api/teacher/journeys] mission → locked', missionError);
      return NextResponse.json({ error: missionError.message }, { status: 500 });
    }

    return NextResponse.json({ journey: { id: journeyId } });
  }
}
