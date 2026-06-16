// =============================================================================
// GET /api/mission?missionId=X  (preferred — exact match by ID)
// GET /api/mission?order=N      (legacy fallback — avoid; ambiguous across journeys)
//
// Returns a PipMission object. Always use missionId when available.
// No auth required — content is educational material, not sensitive.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import type { PipMission, PipPlanet, WorldBriefItem } from '@/lib/pip-mission-types';

export async function GET(req: NextRequest) {
  const missionId  = req.nextUrl.searchParams.get('missionId');
  const orderParam = req.nextUrl.searchParams.get('order');

  let query = supabaseAdmin
    .from('missions')
    .select(`
      id, "order", question, question_description,
      project_title, project_description, opening_message,
      world_brief_summary, world_brief_items, opening_message_2,
      mission_brief, chapter, qa_answers, mission_qa_answers
    `);

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

  // ── Fetch planets for this mission instance ────────────────────────────────
  const { data: planets, error: planetsError } = await supabaseAdmin
    .from('planets')
    .select('label, title, icon, hint')
    .eq('mission_id', mission.id);

  if (planetsError) {
    console.error('[GET /api/mission] planets lookup error:', planetsError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // ── Derive computed fields ─────────────────────────────────────────────────
  const q = mission.question as string;
  const missionBrief = (mission.mission_brief as string | null)
    ?? (q.length > 60 ? q.slice(0, 57) + '…' : q);

  const projectDesc      = mission.project_description as string;
  const firstPara        = projectDesc.split('\n\n')[0].trim();
  const projectObjective = firstPara.length > 320
    ? firstPara.slice(0, 317) + '…'
    : firstPara;

  // ── Build response ─────────────────────────────────────────────────────────
  const pipMission: PipMission = {
    order:             (mission as any).order as number,
    question:          q,
    worldBrief:        mission.question_description as string,
    worldBriefSummary: (mission.world_brief_summary as string | null) ?? '',
    worldBriefItems:   (mission.world_brief_items as WorldBriefItem[] | null) ?? [],
    projectTitle:      mission.project_title as string,
    projectObjective,
    openingMessage:    mission.opening_message as string,
    openingMessage2:   (mission.opening_message_2 as string | null) ?? '',
    missionBrief,
    chapter:           (mission.chapter as string | null) ?? `Ch.${(mission as any).order}`,
    planets: (planets ?? []).map((p): PipPlanet => ({
      icon: (p.icon as string | null) ?? '🌍',
      name: p.label as string,
      hint: (p.hint as string | null) ?? (p.title as string).slice(0, 45),
    })),
    qaAnswers:        (mission.qa_answers as string[] | null) ?? [],
    missionQaAnswers: (mission.mission_qa_answers as string[] | null) ?? [],
  };

  return NextResponse.json(pipMission);
}
