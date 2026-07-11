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

  // 2. Load mission language so we can resolve the correct label translation.
  const { data: missionRow } = await supabaseAdmin
    .from('missions')
    .select('language')
    .eq('id', missionId)
    .single();

  const missionLang: 'en' | 'he' = (missionRow as { language?: string } | null)?.language === 'he' ? 'he' : 'en';

  // 3. Load all sibling planets (same mission) ordered by creation date.
  const { data: siblings } = await supabaseAdmin
    .from('planets')
    .select('id, label, title, translations, created_at')
    .eq('mission_id', missionId)
    .order('created_at', { ascending: true });

  const siblingList = (siblings ?? []) as Array<{
    id: string;
    label: string | null;
    title: string;
    translations: Record<string, Record<string, string>> | null;
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
  function resolveLabel(p: typeof siblingList[number]): string {
    if (missionLang === 'he') {
      const heLabel = p.translations?.he?.label;
      if (heLabel) return heLabel;
    }
    return p.label ?? p.title;
  }

  let nextPlanet: { id: string; label: string; title: string } | null = null;
  // Search forward from the planet after the current one, wrap if needed.
  const searchOrder = [
    ...siblingList.slice(justCompletedIndex + 1),
    ...siblingList.slice(0, justCompletedIndex),
  ];
  for (const candidate of searchOrder) {
    if (!completedSet.has(candidate.id)) {
      nextPlanet = {
        id:    candidate.id,
        label: resolveLabel(candidate),
        title: candidate.title,
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
