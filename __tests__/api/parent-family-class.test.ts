import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    ok:   true,
    user: { user_metadata: { role: 'parent', parent_id: 'parent-1' } },
  }),
}));

// ── In-memory supabase fake ───────────────────────────────────────────────────
// Routes rows per table, matches eq()/in() filters, records inserts/deletes,
// and can be primed with an insert error to simulate unique violations.

type TableState = {
  rows: any[];
  inserted: any[];
  insertError: { code: string; message: string } | null;
  deletedIds: string[];
};

const tables: Record<string, TableState> = {};

function tableState(name: string): TableState {
  if (!tables[name]) {
    tables[name] = { rows: [], inserted: [], insertError: null, deletedIds: [] };
  }
  return tables[name];
}

function makeBuilder(name: string) {
  const state = tableState(name);
  const filters: Array<[string, any]> = [];
  let deleting = false;

  const matching = () =>
    state.rows.filter(row =>
      filters.every(([col, val]) =>
        Array.isArray(val) ? val.includes(row[col]) : row[col] === val,
      ),
    );

  const builder: any = {
    select: () => builder,
    order:  () => builder,
    eq: (col: string, val: any) => { filters.push([col, val]); return builder; },
    in: (col: string, vals: any[]) => { filters.push([col, vals]); return builder; },
    maybeSingle: async () => ({ data: matching()[0] ?? null, error: null }),
    single:      async () => ({ data: matching()[0] ?? null, error: null }),
    insert: (payload: any) => {
      if (state.insertError) {
        const failure = Promise.resolve({ data: null, error: state.insertError });
        return {
          select: () => ({ single: () => failure }),
          then:   failure.then.bind(failure),
          catch:  failure.catch.bind(failure),
        };
      }
      const rows = (Array.isArray(payload) ? payload : [payload]).map((row: any, i: number) => ({
        id: `${name}-new-${state.inserted.length + i + 1}`,
        ...row,
      }));
      state.inserted.push(...rows);
      state.rows.push(...rows);
      const success = Promise.resolve({ data: rows, error: null });
      return {
        select: () => ({ single: async () => ({ data: rows[0], error: null }) }),
        then:   success.then.bind(success),
        catch:  success.catch.bind(success),
      };
    },
    upsert: async () => ({ data: null, error: null }),
    delete: () => { deleting = true; return builder; },
    then: (onFulfilled: any, onRejected: any) => {
      if (deleting) {
        const matched = matching();
        state.deletedIds.push(...matched.map(r => r.id));
        state.rows = state.rows.filter(r => !matched.includes(r));
        return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected);
      }
      return Promise.resolve({ data: matching(), error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: { from: (name: string) => makeBuilder(name) },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function postRequest(url: string, body: object) {
  return new NextRequest(`http://localhost${url}`, {
    method:  'POST',
    body:    JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

async function callFamilyClass(journeyId = 'journey-1') {
  const { POST } = await import('@/app/api/parent/family-class/route');
  return POST(postRequest('/api/parent/family-class', { journeyId }));
}

async function callParentJourneys(journeyId = 'journey-1') {
  const { POST } = await import('@/app/api/parent/journeys/route');
  return POST(postRequest('/api/parent/journeys', { journeyId }));
}

const RACE_ERROR = {
  code:    '23505',
  message: 'duplicate key value violates unique constraint "student_classes_one_per_template"',
};

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key];
  tableState('journeys').rows.push({ id: 'journey-1', title: 'Space Explorers' });
  tableState('parent_child_link').rows.push({ parent_id: 'parent-1', child_id: 'child-1' });
  tableState('missions').rows.push({ id: 'mission-1', journey_id: 'journey-1' });
});

// ── POST /api/parent/family-class ─────────────────────────────────────────────

describe('POST /api/parent/family-class', () => {
  it('creates the family class and enrolls the child on the template journey', async () => {
    const res  = await callFamilyClass();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(tableState('student_classes').inserted).toEqual([
      expect.objectContaining({
        student_id:          'child-1',
        class_id:            body.classId,
        template_journey_id: 'journey-1',
      }),
    ]);
  });

  it('creates the class without enrollment when the invite has not been accepted yet (deferred enroll via accept-invite)', async () => {
    tableState('parent_child_link').rows.length = 0;

    const res = await callFamilyClass();

    expect(res.status).toBe(200);
    expect(tableState('classes').inserted).toHaveLength(1);
    expect(tableState('student_classes').inserted).toHaveLength(0);
  });

  it('returns 409 child_already_enrolled and creates no class when the child already holds a class on that template (e.g. a school class)', async () => {
    tableState('student_classes').rows.push({
      id: 'sc-school', student_id: 'child-1', class_id: 'school-class-1', template_journey_id: 'journey-1',
    });

    const res  = await callFamilyClass();
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe('child_already_enrolled');
    expect(tableState('classes').inserted).toHaveLength(0);
  });

  it('rolls back the class and returns 409 when the enrollment insert loses the one-per-template race', async () => {
    tableState('student_classes').insertError = RACE_ERROR;

    const res  = await callFamilyClass();
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe('child_already_enrolled');
    const classes = tableState('classes');
    expect(classes.inserted).toHaveLength(1);
    expect(classes.deletedIds).toEqual([classes.inserted[0].id]);
  });
});

// ── POST /api/parent/journeys (shares the same creation logic) ────────────────

describe('POST /api/parent/journeys', () => {
  it('rolls back the class and returns 409 when the enrollment insert loses the one-per-template race', async () => {
    tableState('student_classes').insertError = RACE_ERROR;

    const res  = await callParentJourneys();
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe('child_already_enrolled');
    const classes = tableState('classes');
    expect(classes.inserted).toHaveLength(1);
    expect(classes.deletedIds).toEqual([classes.inserted[0].id]);
  });
});
