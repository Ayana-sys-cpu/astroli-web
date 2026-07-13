import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { resolveStudentIdFromRequest } from '@/lib/auth';

// GET /api/student/planet-next?planetId=<uuid>[&classId=<uuid>]
// Returns the next unvisited planet in the same mission + mission progress counts.
// Used by PlanetCelebrationOverlay (Beat 3 — "Where next?").
// No new DB tables; reads planets + planet_session_state.
export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const planetId = searchParams.get('planetId');
  if (!planetId) return NextResponse.json({ error: 'planetId required' }, { status: 400 });

  // 1. Load the current planet to get its mission_id and language.
  const { data: currentPlanet, error: planetErr } = await supabaseAdmin
    .from('planets')
    .select('id, label, title, mission_id, translations')
    .eq('id', planetId)
    .single();

  if (planetErr || !currentPlanet) {
    return NextResponse.json({ error: 'Planet not found' }, { status: 404 });
  }

  const missionId: string = (currentPlanet as Record<string, unknown>).mission_id as string;

  // 2. Language for label resolution. The caller (celebration overlay) passes the SAME
  // language it is rendering in — which honours the student's *class* language, not just
  // the mission's stored language. Fall back to the mission's DB language only when the
  // caller doesn't specify one. (Fixes: English class on a he-flagged mission showing a
  // Hebrew next-planet label.)
  const langParam = searchParams.get('lang');
  let missionLang: 'en' | 'he';
  if (langParam === 'he') missionLang = 'he';
  else if (langParam === 'en') missionLang = 'en';
  else {
    const { data: missionRow } = await supabaseAdmin
      .from('missions')
      .select('language')
      .eq('id', missionId)
      .single();
    missionLang = (missionRow as { language?: string } | null)?.language === 'he' ? 'he' : 'en';
  }

  // 3. Load all sibling planets (same mission) ordered by creation date.
  const { data: siblings } = await supabaseAdmin
    .from('planets')
    .select('id, label, title, translations, planet_question, created_at')
    .eq('mission_id', missionId)
    .order('created_at', { ascending: true });

  const siblingList = (siblings ?? []) as Array<{
    id: string;
    label: string | null;
    title: string;
    translations: Record<string, Record<string, string>> | null;
    planet_question: string | null;
    created_at: string;
  }>;

  const siblingIds = siblingList.map(p => p.id);
  const total = siblingIds.length;

  // 4. Load which sibling planets the student has completed.
  const { data: sessions } = await supabaseAdmin
    .from('planet_session_state')
    .select('planet_id, completed')
    .eq('student_id', studentId)
    .in('planet_id', siblingIds);

  const completedSet = new Set(
    (sessions ?? [])
      .filter((s: { planet_id: string; completed: boolean }) => s.completed)
      .map((s: { planet_id: string; completed: boolean }) => s.planet_id),
  );
  // Treat the just-completed planet as done even if session row lands slightly late.
  completedSet.add(planetId);

  const completed = completedSet.size;
  const justCompletedIndex = siblingList.findIndex(p => p.id === planetId);

  // 5. Find the first sibling after the current planet that isn't complete yet.
  //    Base columns hold English; translations.he holds Hebrew (repo convention —
  //    see getPlanetTitle in mission-state/route.ts). Only reach for a he translation
  //    when rendering in Hebrew.
  function resolveField(p: typeof siblingList[number], field: 'label' | 'title', base: string | null): string {
    if (missionLang === 'he') {
      const he = p.translations?.he?.[field];
      if (he) return he;
    }
    return base ?? p.title;
  }

  let nextPlanet: { id: string; label: string; title: string; tease: string } | null = null;
  // Search forward from the planet after the current one, wrap if needed.
  const searchOrder = [
    ...siblingList.slice(justCompletedIndex + 1),
    ...siblingList.slice(0, justCompletedIndex),
  ];
  for (const candidate of searchOrder) {
    if (!completedSet.has(candidate.id)) {
      const title = resolveField(candidate, 'title', candidate.title);
      // Teaser: the planet's driving question if present, else its title.
      const heQuestion = missionLang === 'he' ? candidate.translations?.he?.planet_question : undefined;
      const tease = (heQuestion || candidate.planet_question || title).trim();
      nextPlanet = {
        id:    candidate.id,
        label: resolveField(candidate, 'label', candidate.label),
        title,
        tease,
      };
      break;
    }
  }

  return NextResponse.json({
    nextPlanet,
    missionProgress: {
      completed,
      total,
      justCompletedIndex: justCompletedIndex >= 0 ? justCompletedIndex : 0,
    },
  });
}
