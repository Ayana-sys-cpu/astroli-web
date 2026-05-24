import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/votes
// Upsert a vote for a student in a vote session.
// If the student already voted in this session, their choice is updated.
// Body: { studentId: string, voteSessionId: string, bigIdeaId: string }
export async function POST(req: NextRequest) {
  let body: { studentId?: string; voteSessionId?: string; bigIdeaId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { studentId, voteSessionId, bigIdeaId } = body;
  if (!studentId || !voteSessionId || !bigIdeaId) {
    return NextResponse.json(
      { error: 'studentId, voteSessionId, and bigIdeaId are required' },
      { status: 400 },
    );
  }

  // Look up journey_id from the session so we can denormalize it on the vote
  // row (needed for Realtime subscriptions that filter by journey_id).
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('vote_sessions')
    .select('journey_id')
    .eq('id', voteSessionId)
    .eq('status', 'open')
    .maybeSingle();

  if (sessionError) {
    console.error('[POST /api/votes] session lookup', sessionError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json({ error: 'Vote session not found or already closed' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('votes')
    .upsert(
      {
        student_id:      studentId,
        vote_session_id: voteSessionId,
        journey_id:      session.journey_id,
        big_idea_id:     bigIdeaId,
      },
      { onConflict: 'student_id,vote_session_id' },
    );

  if (error) {
    console.error('[POST /api/votes]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// GET /api/votes?studentId=&voteSessionId=
// Returns the big idea the student voted for in this session, or null.
export async function GET(req: NextRequest) {
  const studentId     = req.nextUrl.searchParams.get('studentId');
  const voteSessionId = req.nextUrl.searchParams.get('voteSessionId');

  if (!studentId || !voteSessionId) {
    return NextResponse.json(
      { error: 'studentId and voteSessionId are required' },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from('votes')
    .select('big_idea_id')
    .eq('student_id', studentId)
    .eq('vote_session_id', voteSessionId)
    .maybeSingle();

  if (error) {
    console.error('[GET /api/votes]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({ bigIdeaId: data?.big_idea_id ?? null });
}
