// GET /api/parent/home
//
// The warm summary that leads the parent dashboard: what their child learned,
// and one question they can ask about it tonight.
//
// The old parent view was the teacher's drill-down — Perkins levels, "Grace
// Completion", goal-by-goal evidence tables. It answered "how is my child
// performing" in a vocabulary no parent has, and never answered the question a
// parent actually has. This route answers that one.
//
// PRIVACY: every read is scoped to the parent's own verified linked child, at
// the query. These rows quote a minor's own words; a UI-level check is not a
// boundary. See specs/parent/web-app/parent-home-summary/plan.md.
//
// Response: 200 { child, language, stats, topics[] }
//           401 — no session
//           403 — not a parent session

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { resolveParentId, getParentContext } from '@/lib/parent-auth';
import { resolveUserLanguage } from '@/lib/student-language';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type ParentTopicStatus = 'finished' | 'in_progress';

export interface ParentTopic {
  planetId:  string;
  title:     string;
  status:    ParentTopicStatus;
  /** One-sentence recap, from the child's strongest goal insight. */
  recap:     string | null;
  /** Up to 3, generated once at completion. Empty is a normal state. */
  questions: string[];
  completedAt: string | null;
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parentId = resolveParentId(auth.user);
  if (!parentId) {
    return NextResponse.json({ error: 'Forbidden: parent session required' }, { status: 403 });
  }

  const { childId, familyClass } = await getParentContext(parentId);
  const language = await resolveUserLanguage(parentId);

  if (!childId || !familyClass) {
    return NextResponse.json({ child: null, language, stats: null, topics: [] });
  }

  const [{ data: childRow }, { data: planetRows }] = await Promise.all([
    supabaseAdmin.from('users').select('full_name, first_name, email').eq('id', childId).maybeSingle(),
    supabaseAdmin
      .from('missions')
      .select('id, planets(id, label, short_title, translations)')
      .eq('journey_id', familyClass.journey_id),
  ]);

  const planets = (planetRows ?? []).flatMap((m: any) => m.planets ?? []);
  const planetById = new Map(planets.map((p: any) => [p.id, p]));
  const planetIds = planets.map((p: any) => p.id);

  if (planetIds.length === 0) {
    return NextResponse.json({ child: childName(childRow), language, stats: null, topics: [] });
  }

  // Scoped to THIS child. Never widen this to the class.
  const [{ data: summaries }, { data: sessions }] = await Promise.all([
    supabaseAdmin
      .from('planet_summaries')
      .select('id, planet_id, completed_at, parent_questions, total_active_time_minutes')
      .eq('student_id', childId)
      .in('planet_id', planetIds),
    supabaseAdmin
      .from('planet_session_state')
      .select('planet_id, completed')
      .eq('student_id', childId)
      .in('planet_id', planetIds),
  ]);

  const summaryIds = (summaries ?? []).map((s: any) => s.id);
  const { data: goalRows } = summaryIds.length
    ? await supabaseAdmin
        .from('planet_summary_goals')
        .select('summary_id, insight_text, perkins_level_demonstrated')
        .in('summary_id', summaryIds)
    : { data: [] as any[] };

  // The recap is the insight from the goal the child demonstrated most strongly —
  // the most flattering true thing to open a parent's week with.
  const recapBySummary = new Map<string, string>();
  const bestLevel = new Map<string, number>();
  for (const g of goalRows ?? []) {
    if (!g.insight_text) continue;
    const lvl = typeof g.perkins_level_demonstrated === 'number' ? g.perkins_level_demonstrated : 0;
    if (lvl >= (bestLevel.get(g.summary_id) ?? -1)) {
      bestLevel.set(g.summary_id, lvl);
      recapBySummary.set(g.summary_id, g.insight_text);
    }
  }

  const finished: ParentTopic[] = (summaries ?? []).map((s: any) => ({
    planetId:    s.planet_id,
    title:       planetTitle(planetById.get(s.planet_id), language),
    status:      'finished' as const,
    recap:       recapBySummary.get(s.id) ?? null,
    questions:   toQuestions(s.parent_questions),
    completedAt: s.completed_at ?? null,
  }));

  const finishedIds = new Set(finished.map(t => t.planetId));
  const inProgress: ParentTopic[] = (sessions ?? [])
    .filter((r: any) => !r.completed && !finishedIds.has(r.planet_id))
    .map((r: any) => ({
      planetId:    r.planet_id,
      title:       planetTitle(planetById.get(r.planet_id), language),
      status:      'in_progress' as const,
      // Nothing to recap and nothing honest to ask about yet.
      recap:       null,
      questions:   [],
      completedAt: null,
    }));

  const topics = [
    ...finished.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    ...inProgress,
  ];

  const weekAgo = Date.now() - WEEK_MS;
  const finishedThisWeek = finished.filter(
    t => t.completedAt && new Date(t.completedAt).getTime() > weekAgo,
  ).length;

  const { count: conversationCount } = await supabaseAdmin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', childId);

  const totalMinutes = (summaries ?? []).reduce(
    (sum: number, s: any) => sum + (Number(s.total_active_time_minutes) || 0),
    0,
  );

  return NextResponse.json({
    child: childName(childRow),
    language,
    stats: {
      topicsFinishedThisWeek: finishedThisWeek,
      topicsFinishedTotal:    finished.length,
      conversations:          conversationCount ?? 0,
      minutes:                Math.round(totalMinutes),
    },
    topics,
  });
}

function childName(row: any): string | null {
  return row?.full_name ?? row?.first_name ?? row?.email ?? null;
}

function planetTitle(planet: any, language: 'en' | 'he'): string {
  if (!planet) return '';
  const tx = language === 'he' ? ((planet.translations ?? {}).he ?? {}) : {};
  // `label` before `short_title`: the parent has none of the child's context.
  // "Matter & Atoms" tells them what the topic was; "The Recipe" — the name
  // their child sees inside the journey — tells them nothing on its own.
  return tx.label ?? tx.short_title ?? planet.label ?? planet.short_title ?? '';
}

function toQuestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(q => (typeof q === 'string' ? q : (q as any)?.question))
    .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
    .slice(0, 3);
}
