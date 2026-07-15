// GET /api/parent/journeys/catalog?language=en|he
//
// Returns journey templates available to enroll the child in.
// Excludes journeys the child is already enrolled in.
// The `language` param is a delivery preference — all templates are returned
// regardless of language; only the displayed title changes.
// Response: 200 { journeys: [{ id, title, description, missionCount }] }

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { resolveParentId, getParentContext } from '@/lib/parent-auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parentId = resolveParentId(auth.user);
  if (!parentId) {
    return NextResponse.json({ error: 'Forbidden: parent session required' }, { status: 403 });
  }

  const language = req.nextUrl.searchParams.get('language') === 'he' ? 'he' : 'en';

  const { childId } = await getParentContext(parentId);

  // Fetch template IDs the child is already enrolled in
  const enrolledIds: string[] = [];
  if (childId) {
    const { data: enrolled } = await supabaseAdmin
      .from('student_classes')
      .select('template_journey_id')
      .eq('student_id', childId)
      .not('template_journey_id', 'is', null);

    if (enrolled) {
      enrolled.forEach((r: { template_journey_id: string | null }) => {
        if (r.template_journey_id) enrolledIds.push(r.template_journey_id);
      });
    }
  }

  let query = supabaseAdmin
    .from('journeys')
    .select('id, title, title_he, description, missions(id)')
    .eq('is_template', true)
    .order('title');

  if (enrolledIds.length > 0) {
    query = query.not('id', 'in', `(${enrolledIds.join(',')})`);
  }

  const { data: journeys, error } = await query;

  if (error) {
    console.error('[parent/journeys/catalog] fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const body = {
    journeys: (journeys ?? []).map((j: any) => ({
      id:           j.id,
      title:        language === 'he' ? (j.title_he ?? j.title) : j.title,
      description:  j.description ?? '',
      missionCount: Array.isArray(j.missions) ? j.missions.length : 0,
    })),
  };

  const res = NextResponse.json(body);
  res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
  return res;
}
