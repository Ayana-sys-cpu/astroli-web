import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { resolveLanguageByMission } from '@/lib/student-language';

// GET /api/student/planet-summaries — all discovered goals per planet for the authenticated student.
//
// Primary source: planet_session_state + planet_teaching_goals (populated by the bot during chat).
// Supplemental:   planet_summary_goals (populated when the student clicks "Lock In" in the summary
//                 screen) — used only to pull in studentAddition overrides.
//
// This means discoveries are visible as soon as any goal is found, without requiring the student
// to complete the lock-in flow first.
export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const searchParams = new URL(req.url).searchParams;
  const langFilter = (searchParams.get('lang') ?? null) as 'en' | 'he' | null;
  // Optional mission scoping — the Orin guide panel passes the active mission so
  // "What I've discovered" matches the mission map instead of mixing in goals
  // discovered on past missions.
  const missionIdFilter = searchParams.get('missionId');

  try {
    // 1. Find sessions where the student has discovered at least one goal
    let sessionQuery = supabaseAdmin
      .from('planet_session_state')
      .select('planet_id, perkins_map, completed_at')
      .eq('student_id', studentId);

    if (missionIdFilter) {
      const { data: missionPlanets, error: missionPlanetsError } = await supabaseAdmin
        .from('planets')
        .select('id')
        .eq('mission_id', missionIdFilter);
      if (missionPlanetsError) {
        console.error('[planet-summaries] mission planets query error:', missionPlanetsError);
        throw missionPlanetsError;
      }
      const ids = (missionPlanets ?? []).map(p => p.id as string);
      if (ids.length === 0) return NextResponse.json({ summaries: [] });
      sessionQuery = sessionQuery.in('planet_id', ids);
    }

    const { data: sessions, error: sessionError } = await sessionQuery;

    if (sessionError) {
      console.error('[planet-summaries] session query error:', sessionError);
      throw sessionError;
    }

    const activeSessions = (sessions ?? []).filter(s => {
      const map = (s.perkins_map as Record<string, number | null>) ?? {};
      return Object.values(map).some(v => v !== null);
    });

    if (activeSessions.length === 0) {
      return NextResponse.json({ summaries: [] });
    }

    const planetIds = activeSessions.map(s => s.planet_id as string);

    // 2. Resolve planets → missions to get language, teaching goals, and any locked-in additions
    const { data: planetRows, error: planetError } = await supabaseAdmin
      .from('planets')
      .select('id, title, mission_id, translations')
      .in('id', planetIds);

    if (planetError) console.error('[planet-summaries] planets query error:', planetError);

    const missionIds = Array.from(new Set((planetRows ?? []).map(p => (p as any).mission_id as string).filter(Boolean)));

    const [missionsResult, goalsResult, summariesResult] = await Promise.all([
      missionIds.length
        ? supabaseAdmin.from('missions').select('id, journey_id').in('id', missionIds)
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin
        .from('planet_teaching_goals')
        .select('id, planet_id, description, translations')
        .in('planet_id', planetIds)
        .order('goal_order', { ascending: true }),
      supabaseAdmin
        .from('planet_summaries')
        .select('id, planet_id, completed_at, term_definitions, planet_summary_goals(teaching_goal_id, student_addition)')
        .eq('student_id', studentId)
        .in('planet_id', planetIds),
    ]);

    if (goalsResult.error) console.error('[planet-summaries] goals query error:', goalsResult.error);

    // Build language lookup: missionId → language, resolved through the
    // student's own enrollment rather than the shared mission template — the
    // template flag is global and would leak one class's language into every
    // other class on the same journey. See lib/student-language.ts.
    const missionLanguage = await resolveLanguageByMission(
      studentId,
      (missionsResult.data ?? []) as Array<{ id: string; journey_id: string }>,
    );

    // Build planet metadata lookup — planet title uses UI language (langFilter), not
    // the planet's own mission language, so titles stay consistent across contexts.
    const planetMeta: Record<string, { title: string; language: string }> = {};
    for (const p of planetRows ?? []) {
      const missionLang = missionLanguage[(p as any).mission_id] ?? 'en';
      const displayLang = langFilter ?? missionLang;
      const ptx = displayLang === 'he' ? (((p as any).translations as Record<string, any>)?.he ?? {}) : {};
      planetMeta[p.id] = { title: ptx.title ?? p.title, language: missionLang };
    }

    // Build teaching goals by planet
    const goalsByPlanet: Record<string, { id: string; description: string; translations: unknown }[]> = {};
    for (const g of goalsResult.data ?? []) {
      if (!goalsByPlanet[g.planet_id]) goalsByPlanet[g.planet_id] = [];
      goalsByPlanet[g.planet_id].push(g as { id: string; description: string; translations: unknown });
    }

    // Build studentAddition overrides from locked-in summaries: goalId → override text
    const studentAdditionByGoalId: Record<string, string | null> = {};
    const lockedCompletedAt: Record<string, string | null> = {};
    const termDefinitionsByPlanet: Record<string, { label: string; definition: string }[]> = {};
    for (const s of summariesResult.data ?? []) {
      lockedCompletedAt[(s as any).planet_id] = (s as any).completed_at ?? null;
      termDefinitionsByPlanet[(s as any).planet_id] = (s as any).term_definitions ?? [];
      for (const g of (s as any).planet_summary_goals ?? []) {
        if (g.student_addition) {
          studentAdditionByGoalId[g.teaching_goal_id] = g.student_addition;
        }
      }
    }

    // 3. Build response: one entry per planet with discovered goals.
    //    Always include all planets — never filter by language. Use langFilter
    //    (the UI language) to pick which description text to show, so Hebrew
    //    discoveries appear in English when viewed from an English journey and
    //    vice-versa.
    const result = activeSessions.map(session => {
      const perkinsMap = (session.perkins_map as Record<string, number | null>) ?? {};
      const discoveredGoalIds = new Set(
        Object.entries(perkinsMap)
          .filter(([, v]) => v !== null)
          .map(([k]) => k),
      );

      const meta        = planetMeta[session.planet_id as string];
      const displayLang = langFilter ?? meta?.language ?? 'en';
      const allGoals    = goalsByPlanet[session.planet_id as string] ?? [];

      const insights = allGoals
        .filter(g => discoveredGoalIds.has(g.id))
        .map(g => {
          const gtx = displayLang === 'he' ? ((g.translations as Record<string, any>)?.he ?? {}) : {};
          return {
            insightText:     (gtx.description as string | undefined) ?? g.description,
            studentAddition: studentAdditionByGoalId[g.id] ?? null,
          };
        });

      return {
        planetId:        session.planet_id as string,
        planetTitle:     meta?.title ?? 'Unknown Planet',
        completedAt:     lockedCompletedAt[session.planet_id as string] ?? (session.completed_at as string | null) ?? null,
        insights,
        termDefinitions: termDefinitionsByPlanet[session.planet_id as string] ?? [],
      };
    });

    return NextResponse.json({ summaries: result });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
