// =============================================================================
// GET /api/mission?missionId=X  (preferred — exact match by ID)
// GET /api/mission?order=N      (legacy fallback — avoid; ambiguous across journeys)
//
// Returns a OrinMission object. Always use missionId when available.
// No auth required — content is educational material, not sensitive.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import type { OrinMission, OrinPlanet, MissionTerm, WorldBriefItem } from '@/lib/orin-guide-types';

function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function GET(req: NextRequest) {
  const missionId  = req.nextUrl.searchParams.get('missionId');
  const orderParam = req.nextUrl.searchParams.get('order');
  const langParam  = req.nextUrl.searchParams.get('lang');

  let query = supabaseAdmin
    .from('missions')
    .select(`
      id, "order", language, question, question_description,
      project_title, project_description, opening_message,
      world_brief_summary, world_brief_items, opening_message_2,
      mission_brief, chapter, qa_answers, mission_qa_answers, translations,
      planets ( id, label, title, icon, hint, translations )
    `)
    .order('created_at', { referencedTable: 'planets' });

  if (missionId) {
    query = query.eq('id', missionId).limit(1);
  } else {
    const order = parseInt(orderParam ?? '1', 10);
    if (isNaN(order) || order < 1) {
      return NextResponse.json({ error: 'order must be a positive integer' }, { status: 400 });
    }
    query = query.eq('"order"', order).limit(10);
  }

  const { data: rows, error: missionError } = await query;

  if (missionError) {
    console.error('[GET /api/mission] mission lookup error:', missionError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (!rows?.length) {
    return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
  }

  // When querying by order (legacy), prefer a backfilled row
  const mission = missionId
    ? rows[0]
    : (rows.find((r) => r.world_brief_summary != null) ?? rows[0]);

  // Planets arrive embedded via the missions→planets FK; teaching goals have
  // no FK to planets (planet_id is a bare TEXT column), so they need their
  // own query once the planet ids are known.
  const planets = ((mission as any).planets ?? []) as any[];

  const planetIds = planets.map((p) => (p as any).id as string);
  const { data: teachingGoals } = planetIds.length
    ? await supabaseAdmin
        .from('planet_teaching_goals')
        .select('planet_id, slug, description, translations')
        .in('planet_id', planetIds)
        .order('goal_order', { ascending: true })
    : { data: [] };

  // ── Resolve language: explicit param overrides DB value ───────────────────
  const missionLanguage: 'en' | 'he' = langParam
    ? (langParam === 'he' ? 'he' : 'en')
    : (((mission as any).language as string | null) === 'he' ? 'he' : 'en');

  // ── Apply translations for all user-visible fields when language is Hebrew ──
  const tx: Record<string, any> = missionLanguage === 'he'
    ? ((mission as any).translations as Record<string, any>)?.he ?? {}
    : {};

  // ── Derive computed fields ────────────────────────────────────────────────
  const q = (tx.question ?? mission.question ?? '') as string;
  const missionBrief = (tx.mission_brief ?? mission.mission_brief as string | null)
    ?? (q.length > 60 ? q.slice(0, 57) + '…' : q);

  const projectDescRaw = (tx.project_description ?? mission.project_description ?? '') as string;
  const firstPara      = projectDescRaw.split('\n\n')[0].trim();
  const projectObjective = firstPara.length > 320
    ? firstPara.slice(0, 317) + '…'
    : firstPara;

  // ── Build response ─────────────────────────────────────────────────────────
  const orinMission: OrinMission = {
    id:                mission.id,
    order:             (mission as any).order as number,
    language:          missionLanguage,
    question:          q,
    worldBrief:        (tx.question_description ?? mission.question_description ?? '') as string,
    worldBriefSummary: (tx.world_brief_summary ?? mission.world_brief_summary as string | null) ?? '',
    worldBriefItems:   (tx.world_brief_items ?? mission.world_brief_items as WorldBriefItem[] | null) ?? [],
    projectTitle:      (tx.project_title ?? mission.project_title ?? '') as string,
    projectObjective,
    openingMessage:    (tx.opening_message ?? mission.opening_message ?? '') as string,
    openingMessage2:   (tx.opening_message_2 ?? mission.opening_message_2 as string | null) ?? '',
    missionBrief,
    chapter:           (tx.chapter ?? mission.chapter as string | null) ?? `Ch.${(mission as any).order}`,
    planets: planets.map((p): OrinPlanet => {
      const ptx: Record<string, any> = missionLanguage === 'he'
        ? ((p as any).translations as Record<string, any>)?.he ?? {}
        : {};
      return {
        icon: (p.icon as string | null) ?? '🌍',
        name: (ptx.label ?? p.label ?? '') as string,
        hint: (ptx.hint ?? p.hint as string | null) ?? ((ptx.title ?? p.title ?? '') as string).slice(0, 45),
      };
    }),
    allTerms: (teachingGoals ?? []).map((g): MissionTerm => {
      const gtx: Record<string, any> = missionLanguage === 'he'
        ? ((g as any).translations as Record<string, any>)?.he ?? {}
        : {};
      return {
        label:      (gtx.slug_label as string | undefined) ?? slugToLabel(g.slug),
        definition: (gtx.description as string | undefined) ?? g.description,
      };
    }),
    qaAnswers:        (tx.qa_answers ?? mission.qa_answers as string[] | null) ?? [],
    missionQaAnswers: (tx.mission_qa_answers ?? mission.mission_qa_answers as string[] | null) ?? [],
  };

  // Public curriculum content that only changes when a teacher edits it —
  // let the CDN absorb the per-visit refetches from the guide panel.
  return NextResponse.json(orinMission, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
  });
}
