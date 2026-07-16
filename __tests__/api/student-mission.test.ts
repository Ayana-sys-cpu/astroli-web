import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// In-memory tables the mock serves. Reset per test.
const tables: Record<string, any[]> = {
  missions: [],
  planets: [],
  student_classes: [],
  classes: [],
  class_mission_state: [],
};

// Chainable query builder that filters `tables[tableName]`. maybeSingle() and
// single() mirror real supabase-js/PostgREST semantics — in particular,
// maybeSingle() with MORE than one matching row resolves { data: null, error }
// (code PGRST116), which is the failure mode behind the duplicate-enrollment
// language bug this suite guards against.
function tableBuilder(tableName: string) {
  let rows: any[] = [];
  let selectedColumns = '';

  function finalizeRows() {
    if (tableName === 'missions' && selectedColumns.includes('planets')) {
      return rows.map((m) => ({
        ...m,
        planets: (tables.planets ?? []).filter((p) => p.mission_id === m.id),
      }));
    }
    if (tableName === 'planets' && selectedColumns.includes('missions')) {
      return rows.map((p) => ({
        ...p,
        missions: (tables.missions ?? []).find((m) => m.id === p.mission_id) ?? null,
      }));
    }
    return rows;
  }

  // Chained order() calls are primary/secondary sort keys (PostgREST
  // `order=a.desc,b.desc`), not independent re-sorts.
  const orderSpecs: { column: string; ascending: boolean }[] = [];

  const builder: any = {
    select(columns: string) {
      selectedColumns = columns;
      rows = [...(tables[tableName] ?? [])];
      return builder;
    },
    eq(column: string, value: any) {
      rows = rows.filter((r) => r[column.replaceAll('"', '')] === value);
      return builder;
    },
    in(column: string, values: any[]) {
      rows = rows.filter((r) => values.includes(r[column]));
      return builder;
    },
    order(column: string, opts?: { ascending?: boolean; referencedTable?: string }) {
      if (!opts?.referencedTable) {
        orderSpecs.push({ column, ascending: opts?.ascending !== false });
        rows = [...rows].sort((a, b) => {
          for (const spec of orderSpecs) {
            const cmp = a[spec.column] < b[spec.column] ? -1 : a[spec.column] > b[spec.column] ? 1 : 0;
            if (cmp !== 0) return spec.ascending ? cmp : -cmp;
          }
          return 0;
        });
      }
      return builder;
    },
    limit(count: number) {
      rows = rows.slice(0, count);
      return builder;
    },
    single() {
      const data = finalizeRows();
      return data.length === 1
        ? Promise.resolve({ data: data[0], error: null })
        : Promise.resolve({ data: null, error: { code: 'PGRST116' } });
    },
    maybeSingle() {
      const data = finalizeRows();
      if (data.length > 1) {
        return Promise.resolve({
          data: null,
          error: { code: 'PGRST116', message: 'multiple (or no) rows returned' },
        });
      }
      return Promise.resolve({ data: data[0] ?? null, error: null });
    },
    then(resolve: any, reject: any) {
      return Promise.resolve({ data: finalizeRows(), error: null }).then(resolve, reject);
    },
  };
  return builder;
}

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: { from: (table: string) => tableBuilder(table) },
}));

vi.mock('@/lib/auth', () => ({
  resolveStudentIdFromRequest: () => Promise.resolve('student-1'),
}));

const hebrewMission = {
  id: 'm1',
  journey_id: 'j1',
  language: 'he',
  question: 'שאלה',
  question_description: null,
  project_title: null,
  project_description: null,
  opening_message: null,
  order: 1,
  translations: { he: { question: 'שאלה' } },
};

function enrollment(classId: string, enrolledAt: string) {
  return {
    id: `enr-${classId}`,
    student_id: 'student-1',
    class_id: classId,
    template_journey_id: 'j1',
    enrolled_at: enrolledAt,
  };
}

async function callStudentMission(query: string) {
  const { GET } = await import('@/app/api/student/mission/route');
  return GET(new NextRequest(`http://localhost/api/student/mission${query}`));
}

describe('GET /api/student/mission — class language resolution', () => {
  beforeEach(() => {
    tables.missions = [{ ...hebrewMission }];
    tables.planets = [
      { id: 'p1', mission_id: 'm1', title: 'Planet One', label: null, short_title: null, planet_question: null, translations: null },
    ];
    tables.classes = [
      { id: 'c-school', language: 'en' },
      { id: 'c-family', language: 'en' },
    ];
    tables.student_classes = [
      enrollment('c-school', '2026-07-01T10:00:00+00:00'),
      enrollment('c-family', '2026-07-10T10:00:00+00:00'),
    ];
    tables.class_mission_state = [
      { class_id: 'c-school', mission_id: 'm1', state: 'locked' },
      { class_id: 'c-family', mission_id: 'm1', state: 'active' },
    ];
  });

  it('uses the class language when the student is enrolled in two classes on the same template journey', async () => {
    const res = await callStudentMission('?missionId=m1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mission.language).toBe('en');
  });

  it('resolves mission state from the most recent enrollment when there are two', async () => {
    const res = await callStudentMission('?missionId=m1');
    const body = await res.json();
    expect(body.mission.state).toBe('active'); // c-family, enrolled last
  });

  it('prefers the most recent enrollment when the two classes disagree on language', async () => {
    tables.classes = [
      { id: 'c-school', language: 'en' },
      { id: 'c-family', language: 'he' },
    ];
    const res = await callStudentMission('?missionId=m1');
    const body = await res.json();
    expect(body.mission.language).toBe('he');
  });

  it('uses the class language on the planetId path when no classId is passed', async () => {
    const res = await callStudentMission('?planetId=p1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.planet.missionLanguage).toBe('en');
  });

  it('still resolves the class language for a single enrollment', async () => {
    tables.student_classes = [enrollment('c-school', '2026-07-01T10:00:00+00:00')];
    const res = await callStudentMission('?missionId=m1');
    const body = await res.json();
    expect(body.mission.language).toBe('en');
    expect(body.mission.state).toBe('locked');
  });

  // Class language always wins; without a class the route defaults to English
  // rather than the mission's authored language (f2ba7cb — Hebrew-tagged
  // missions must not serve Hebrew to students outside an explicit Hebrew class).
  it('defaults to English when the student has no enrollment', async () => {
    tables.student_classes = [];
    const res = await callStudentMission('?missionId=m1');
    const body = await res.json();
    expect(body.mission.language).toBe('en');
    expect(body.mission.state).toBe(null);
  });

  it('defaults to English on the planetId path when the student has no enrollment', async () => {
    tables.student_classes = [];
    const res = await callStudentMission('?planetId=p1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.planet.missionLanguage).toBe('en'); // Hebrew-tagged mission must not serve Hebrew to unenrolled/bot contexts
  });
});
