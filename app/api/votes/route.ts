import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, resolveStudentId } from '@/lib/auth';
import { z, parseBody } from '@/lib/validate';
import { awardCoins } from '@/lib/coin-service';

const VoteSchema = z.object({
  voteSessionId: z.string().trim().uuid('voteSessionId must be a UUID'),
  bigIdeaId:     z.string().trim().uuid('bigIdeaId must be a UUID'),
});

// POST /api/votes
// Upsert a vote for the authenticated student in a vote session.
// Body: { voteSessionId: string, bigIdeaId: string }
// studentId is taken from the session — never from the body.
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const studentId = await resolveStudentId(auth.user);
  if (!studentId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = await parseBody(req, VoteSchema);
  if (!parsed.ok) return parsed.response;
  const { voteSessionId, bigIdeaId } = parsed.data;

  const { data: session, error: sessionLookupError } = await supabaseAdmin
    .from('vote_sessions')
    .select('class_id')
    .eq('id', voteSessionId)
    .eq('status', 'open')
    .maybeSingle();

  if (sessionLookupError) {
    console.error('[POST /api/votes] session lookup', sessionLookupError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json({ error: 'Vote session not found or already closed' }, { status: 404 });
  }

  // votes.journey_id was dropped by the classes-split cleanup migration —
  // class_id is the only FK now.
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('votes')
    .upsert(
      {
        student_id:      studentId,
        vote_session_id: voteSessionId,
        class_id:        session.class_id,
        big_idea_id:     bigIdeaId,
        updated_at:      now,
      },
      { onConflict: 'student_id,vote_session_id' },
    );

  if (error) {
    console.error('[POST /api/votes]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  const coinReward = await awardCoins(supabaseAdmin, studentId, 'first_vote', voteSessionId);

  return NextResponse.json({
    ok: true,
    ...(coinReward.awarded ? { coinReward: { ...coinReward, eventType: 'first_vote' } } : {}),
  });
}

// GET /api/votes?voteSessionId=
// Returns the big idea the authenticated student voted for, or null.
// studentId is taken from the session — the ?studentId= query param is ignored.
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const studentId = await resolveStudentId(auth.user);
  if (!studentId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const voteSessionId = req.nextUrl.searchParams.get('voteSessionId');

  if (!voteSessionId) {
    return NextResponse.json({ error: 'voteSessionId is required' }, { status: 400 });
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
