// GET /api/parent/journeys
//
// Returns all available curriculum journey templates for the parent to choose from.
// Response: 200 { journeys: [{ id, title, description, missionCount }] }

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { resolveParentId } from '@/lib/parent-auth';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parentId = resolveParentId(auth.user);
  if (!parentId) {
    return NextResponse.json({ error: 'Forbidden: parent session required' }, { status: 403 });
  }

  const { data: journeys, error } = await supabaseAdmin
    .from('journeys')
    .select('id, title, description')
    .order('title');

  if (error) {
    console.error('[parent/journeys] fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count missions per journey
  const journeyIds = (journeys ?? []).map((j: any) => j.id);
  const { data: missionCounts } = await supabaseAdmin
    .from('missions')
    .select('journey_id')
    .in('journey_id', journeyIds);

  const countByJourney = new Map<string, number>();
  for (const m of missionCounts ?? []) {
    countByJourney.set(m.journey_id, (countByJourney.get(m.journey_id) ?? 0) + 1);
  }

  return NextResponse.json({
    journeys: (journeys ?? []).map((j: any) => ({
      id:           j.id,
      title:        j.title,
      description:  j.description ?? '',
      missionCount: countByJourney.get(j.id) ?? 0,
    })),
  });
}
