import { describe, it, expect, vi, beforeEach } from 'vitest';

// These rows quote a minor's own words. The scoping below is the boundary — a
// UI-level check is not one — so it is asserted, not inspected.

const hoisted = vi.hoisted(() => ({
  authUser: { user_metadata: { role: 'parent', parent_id: 'parent-1' } } as any,
  authOk: true,
}));

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(async () =>
    hoisted.authOk
      ? { ok: true, user: hoisted.authUser }
      : { ok: false, response: new Response(null, { status: 401 }) },
  ),
}));

vi.mock('@/lib/student-language', () => ({
  resolveUserLanguage: vi.fn(async () => 'en'),
}));

// Parent context: parent-1 owns child-1. parent-2 owns nobody.
vi.mock('@/lib/parent-auth', () => ({
  resolveParentId: (user: any) => user?.user_metadata?.parent_id ?? null,
  getParentContext: vi.fn(async (parentId: string) =>
    parentId === 'parent-1'
      ? { childId: 'child-1', familyClass: { id: 'class-1', journey_id: 'journey-1', title: 'T', language: 'en' } }
      : { childId: null, familyClass: null },
  ),
}));

// Records every student_id a query was scoped to, so the test can assert that
// no read ever escapes the caller's own child.
const scopedStudentIds: string[] = [];

const DATA: Record<string, any[]> = {
  users: [{ id: 'child-1', full_name: 'Eran Radzi Gordon', first_name: 'Eran', email: 'e@x.com' }],
  missions: [{ id: 'm1', journey_id: 'journey-1', planets: [{ id: 'p1', label: 'Nothing is ever lost', short_title: 'Nothing is ever lost', translations: {} }] }],
  planet_summaries: [{
    id: 's1', planet_id: 'p1', student_id: 'child-1',
    completed_at: new Date().toISOString(), total_active_time_minutes: 9.4,
    parent_questions: [{ question: 'Where does burnt paper go?' }, { question: 'Why does a puddle vanish?' }, { question: 'Where does melted ice cream go?' }],
  }],
  planet_session_state: [{ planet_id: 'p1', student_id: 'child-1', completed: true }],
  planet_summary_goals: [
    { summary_id: 's1', insight_text: 'Weak insight', perkins_level_demonstrated: 2 },
    { summary_id: 's1', insight_text: 'Understood that burning rearranges matter', perkins_level_demonstrated: 5 },
  ],
};

function builder(table: string) {
  const filters: Array<[string, any]> = [];
  const b: any = {
    select: () => b,
    eq: (col: string, val: any) => {
      if (col === 'student_id') scopedStudentIds.push(val);
      filters.push([col, val]);
      return b;
    },
    in: (col: string, vals: any[]) => { filters.push([col, vals]); return b; },
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    then: (res: any) => Promise.resolve({ data: rows(), error: null, count: rows().length }).then(res),
  };
  const rows = () =>
    (DATA[table] ?? []).filter(r =>
      filters.every(([c, v]) => (Array.isArray(v) ? v.includes(r[c]) : r[c] === v)),
    );
  return b;
}

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: { from: (t: string) => builder(t) },
}));

const { GET } = await import('@/app/api/parent/home/route');

beforeEach(() => {
  scopedStudentIds.length = 0;
  hoisted.authOk = true;
  hoisted.authUser = { user_metadata: { role: 'parent', parent_id: 'parent-1' } };
});

describe('GET /api/parent/home', () => {
  it('401s without a session', async () => {
    hoisted.authOk = false;
    expect((await GET()).status).toBe(401);
  });

  it('403s for a signed-in non-parent', async () => {
    hoisted.authUser = { user_metadata: { role: 'student' } };
    expect((await GET()).status).toBe(403);
  });

  // The invariant that matters: a parent with no linked child gets nothing, not
  // somebody else's child.
  it('returns an empty payload for a parent with no linked child', async () => {
    hoisted.authUser = { user_metadata: { role: 'parent', parent_id: 'parent-2' } };
    const body = await (await GET()).json();
    expect(body.child).toBeNull();
    expect(body.topics).toEqual([]);
    expect(scopedStudentIds).not.toContain('child-1');
  });

  it('never queries a student other than the caller\'s own child', async () => {
    await GET();
    expect(scopedStudentIds.length).toBeGreaterThan(0);
    expect(new Set(scopedStudentIds)).toEqual(new Set(['child-1']));
  });

  it('returns the finished topic with its questions', async () => {
    const body = await (await GET()).json();
    expect(body.child).toBe('Eran Radzi Gordon');
    expect(body.topics).toHaveLength(1);
    expect(body.topics[0].status).toBe('finished');
    expect(body.topics[0].questions).toHaveLength(3);
  });

  it('recaps from the most strongly demonstrated goal, not the first one', async () => {
    const body = await (await GET()).json();
    expect(body.topics[0].recap).toBe('Understood that burning rearranges matter');
  });

  it('caps questions at three even if more were stored', async () => {
    DATA.planet_summaries[0].parent_questions = Array.from({ length: 6 }, (_, i) => ({ question: `q${i}` }));
    const body = await (await GET()).json();
    expect(body.topics[0].questions).toHaveLength(3);
  });

  // Generation is best-effort, so an empty array is a normal state. The card
  // must degrade to its recap rather than showing a placeholder.
  it('returns an empty question list rather than failing when generation produced none', async () => {
    DATA.planet_summaries[0].parent_questions = [];
    const body = await (await GET()).json();
    expect(body.topics[0].questions).toEqual([]);
    expect(body.topics[0].recap).toBeTruthy();
  });

  it('ignores malformed stored questions', async () => {
    DATA.planet_summaries[0].parent_questions = [{ question: 'good' }, { nope: 1 }, null, { question: '  ' }];
    const body = await (await GET()).json();
    expect(body.topics[0].questions).toEqual(['good']);
  });
});
