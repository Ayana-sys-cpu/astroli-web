// =============================================================================
// /api/curriculum
//
// GET ?id=<journeyId>
//
// Returns missions + planets for a curriculum template journey. Every journey
// is a template now (classes are a separate table) — no ownership check is
// needed: any authenticated teacher may preview any curriculum template.
// See docs/architecture/2026-06-16-journeys-classes-redesign.md.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const journeyId = req.nextUrl.searchParams.get('id');
  if (!journeyId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const { data: journey } = await supabaseAdmin
    .from('journeys')
    .select('id, title')
    .eq('id', journeyId)
    .single();

  if (!journey) {
    return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
  }

  const { data: missions, error } = await supabaseAdmin
    .from('missions')
    .select('id, order, question, question_description, project_title, project_description, planets(id, title)')
    .eq('journey_id', journeyId)
    .order('order');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    missions: (missions ?? []).map(m => ({
      id:                  m.id,
      order:               m.order,
      question:            m.question,
      questionDescription: m.question_description,
      projectTitle:        m.project_title,
      projectDescription:  m.project_description,
      planets: ((m.planets as any[]) ?? []).map(p => ({
        id:    p.id,
        title: p.title,
      })),
    })),
  });
}
