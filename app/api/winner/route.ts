import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/winner?voteSessionId=
// Tallies all votes for a session and returns the winning big idea ID.
// Tie-break: alphabetically lowest ID wins — deterministic across all devices.
// Returns { winnerId: string | null } — null if no votes have been cast yet.
export async function GET(req: NextRequest) {
  const voteSessionId = req.nextUrl.searchParams.get('voteSessionId');
  if (!voteSessionId) {
    return NextResponse.json({ error: 'voteSessionId is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('vote_counts')
    .select('big_idea_id, vote_count')
    .eq('vote_session_id', voteSessionId)
    .order('vote_count', { ascending: false })
    .order('big_idea_id', { ascending: true });

  if (error) {
    console.error('[GET /api/winner]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  const winnerId = (data ?? [])[0]?.big_idea_id ?? null;
  return NextResponse.json({ winnerId });
}
