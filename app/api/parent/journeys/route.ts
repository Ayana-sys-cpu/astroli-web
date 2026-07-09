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

  // Single query: embed missions via the FK relation (PostgREST LEFT JOIN).
  // Previously: two sequential awaits (journeys → then mission count).
  // Now: one round-trip; mission count derived from the embedded array length.
  const { data: journeys, error } = await supabaseAdmin
    .from('journeys')
    .select('id, title, description, missions(id)')
    .eq('is_template', true)
    .order('title');

  if (error) {
    console.error('[parent/journeys] fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const body = {
    journeys: (journeys ?? []).map((j: any) => ({
      id:           j.id,
      title:        j.title,
      description:  j.description ?? '',
      missionCount: Array.isArray(j.missions) ? j.missions.length : 0,
    })),
  };

  // Journey templates change rarely — cache for 5 min, serve stale for 10 min
  // while revalidating in the background.
  const res = NextResponse.json(body);
  res.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
  return res;
}
