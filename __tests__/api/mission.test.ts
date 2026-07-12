import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// In-memory tables the mock serves. Reset per test.
const tables: Record<string, any[]> = {
  missions: [],
  planets: [],
  planet_teaching_goals: [],
};

// Chainable query builder that filters `tables[tableName]`. When a missions
// select embeds planets, they are attached from the planets table by
// mission_id — so the suite is agnostic to whether the route fetches planets
// standalone or embedded via the missions FK.
function tableBuilder(tableName: string) {
  let rows: any[] = [];
  let selectedColumns = '';
  const builder: any = {
    select(columns: string) {
      selectedColumns = columns;
      rows = [...(tables[tableName] ?? [])];
      return builder;
    },
    eq(column: string, value: any) {
      const key = column.replaceAll('"', '');
      rows = rows.filter((r) => r[key] === value);
      return builder;
    },
    in(column: string, values: any[]) {
      rows = rows.filter((r) => values.includes(r[column]));
      return builder;
    },
    limit() {
      return builder;
    },
    order(column: string, opts?: { referencedTable?: string }) {
      if (!opts?.referencedTable) {
        rows = [...rows].sort((a, b) => a[column] - b[column]);
      }
      return builder;
    },
    then(resolve: any, reject: any) {
      if (tableName === 'missions' && selectedColumns.includes('planets')) {
        rows = rows.map((m) => ({
          ...m,
          planets: (tables.planets ?? []).filter((p) => p.mission_id === m.id),
        }));
      }
      return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
    },
  };
  return builder;
}

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: { from: (table: string) => tableBuilder(table) },
}));

const baseMission = {
  id: 'm1',
  order: 3,
  language: 'en',
  question: 'Why did Rome fall?',
  question_description: 'The world brief text',
  project_title: 'Rome Project',
  project_description: 'First paragraph.\n\nSecond paragraph.',
  opening_message: 'Welcome!',
  opening_message_2: 'Part two',
  mission_brief: 'Brief',
  chapter: 'Ch.3 — Rome',
  qa_answers: ['a1'],
  mission_qa_answers: ['ma1'],
  translations: null as any,
};

async function callMission(query: string) {
  const { GET } = await import('@/app/api/mission/route');
  return GET(new NextRequest(`http://localhost/api/mission${query}`));
}

describe('GET /api/mission', () => {
  beforeEach(() => {
    tables.missions = [{ ...baseMission }];
    tables.planets = [
      { id: 'p1', mission_id: 'm1', label: 'Senate', title: 'The Senate', icon: '🏛️', hint: 'Politics', translations: null },
      { id: 'p2', mission_id: 'm1', label: 'Legion', title: 'The Legion', icon: '⚔️', hint: null, translations: null },
    ];
    tables.planet_teaching_goals = [
      { planet_id: 'p1', slug: 'fall-of-rome', description: 'Understand the fall', goal_order: 1, translations: null },
      { planet_id: 'p2', slug: 'dual-pillars', description: 'Explain the pillars', goal_order: 0, translations: null },
    ];
  });

  it('returns the mission with its planets and teaching-goal terms', async () => {
    const res = await callMission('?missionId=m1');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.id).toBe('m1');
    expect(body.question).toBe('Why did Rome fall?');
    expect(body.projectObjective).toBe('First paragraph.');
    expect(body.qaAnswers).toEqual(['a1']);
    expect(body.missionQaAnswers).toEqual(['ma1']);
    expect(body.planets).toEqual([
      { icon: '🏛️', name: 'Senate', hint: 'Politics' },
      { icon: '⚔️', name: 'Legion', hint: 'The Legion' }, // hint falls back to title
    ]);
    // Terms follow goal_order, labels derived from slugs
    expect(body.allTerms).toEqual([
      { label: 'Dual Pillars', definition: 'Explain the pillars' },
      { label: 'Fall Of Rome', definition: 'Understand the fall' },
    ]);
  });

  it('marks the response as CDN-cacheable public content', async () => {
    const res = await callMission('?missionId=m1');
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=300, stale-while-revalidate=3600');
  });

  it('applies Hebrew translations when lang=he', async () => {
    tables.missions[0].translations = { he: { question: 'למה רומא נפלה?' } };
    const res = await callMission('?missionId=m1&lang=he');
    const body = await res.json();
    expect(body.language).toBe('he');
    expect(body.question).toBe('למה רומא נפלה?');
  });

  it('returns the first matching row on the legacy order path', async () => {
    tables.missions = [
      { ...baseMission, id: 'm-first' },
      { ...baseMission, id: 'm-second' },
    ];
    tables.planets = [];
    const res = await callMission('?order=3');
    const body = await res.json();
    expect(body.id).toBe('m-first');
  });

  it('defaults qaAnswers to an empty array when the mission has none', async () => {
    tables.missions = [{ ...baseMission, qa_answers: null, mission_qa_answers: null }];
    const res = await callMission('?missionId=m1');
    const body = await res.json();
    expect(body.qaAnswers).toEqual([]);
    expect(body.missionQaAnswers).toEqual([]);
  });

  it('returns 404 for an unknown mission', async () => {
    const res = await callMission('?missionId=nope');
    expect(res.status).toBe(404);
  });

  it('returns 400 for a non-positive order', async () => {
    const res = await callMission('?order=0');
    expect(res.status).toBe(400);
  });
});
