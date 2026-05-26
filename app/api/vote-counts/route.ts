import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// GET /api/vote-counts?voteSessionId=
// Returns aggregated vote counts per big idea for a specific vote session.
// Response: { counts: { [bigIdeaId]: number } }
export async function GET(req: NextRequest) {
  const voteSessionId = req.nextUrl.searchParams.get('voteSessionId');
  if (!voteSessionId) {
    return NextResponse.json({ error: 'voteSessionId is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('vote_counts')
    .select('big_idea_id, vote_count')
    .eq('vote_session_id', voteSessionId);

  if (error) {
    console.error('[GET /api/vote-counts]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.big_idea_id] = Number(row.vote_count);
  }

  return NextResponse.json({ counts });
}
