import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  resolveStudentIdFromRequest: vi.fn(),
}));

const ALLOWED = 'ayana.student.test@gmail.com';

interface EditRow {
  id: string;
  edit_type: string;
  planet_id: string;
  interest_theme: string | null;
  hook: string;
  media_url: string;
  media_type: string;
  media_credit: string;
  status: string;
  created_at: string;
}

function edit(over: Partial<EditRow> & { id: string }): EditRow {
  return {
    edit_type: 'did_you_know',
    planet_id: 'planet-1',
    interest_theme: null,
    hook: `hook ${over.id}`,
    media_url: 'https://img/x.jpg',
    media_type: 'image',
    media_credit: 'Someone / Unsplash',
    status: 'live',
    created_at: '2026-07-01T00:00:00Z',
    ...over,
  };
}

/** One class → one journey → one mission → two planets, as the nested select returns it. */
const CLASS_WITH_PLANETS = {
  id: 'class-1',
  journeys: {
    missions: [
      {
        id: 'mission-1',
        planets: [
          { id: 'planet-1', created_at: '2026-06-01T00:00:00Z' },
          { id: 'planet-2', created_at: '2026-06-02T00:00:00Z' },
        ],
      },
    ],
  },
};

const state = {
  email: ALLOWED as string | null,
  classes: [{ class_id: 'class-1' }] as any[],
  classRows: [CLASS_WITH_PLANETS] as any[],
  activeState: [{ mission_id: 'mission-1' }] as any[],
  completed: [] as any[],
  interests: { interests: ['space'] } as any,
  seen: [] as any[],
  edits: [] as EditRow[],
  throwOn: null as string | null,
};

const writes: string[] = [];

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (state.throwOn === table) throw new Error('boom');

      const filters: { status?: string } = {};

      const rowsFor = (): any[] => {
        switch (table) {
          case 'users': return state.email ? [{ email: state.email }] : [];
          case 'student_classes': return state.classes;
          case 'classes': return state.classRows;
          case 'class_mission_state': return state.activeState;
          case 'planet_session_state': return state.completed;
          case 'students': return [state.interests];
          case 'feed_events': return state.seen;
          case 'feed_edits': return state.edits.filter((e) => e.status === (filters.status ?? 'live'));
          default: return [];
        }
      };

      const builder: any = {
        select: () => builder,
        eq: (col: string, value: string) => {
          if (col === 'status') filters.status = value;
          return builder;
        },
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: () => Promise.resolve({ data: rowsFor()[0] ?? null }),
        insert: (v: unknown) => { writes.push(`insert:${table}`); return Promise.resolve({ data: v }); },
        update: (v: unknown) => { writes.push(`update:${table}`); return Promise.resolve({ data: v }); },
        then: (resolve: (r: { data: any[] }) => unknown) => Promise.resolve({ data: rowsFor() }).then(resolve),
        catch: () => builder,
      };
      return builder;
    }),
  },
}));

import { resolveStudentIdFromRequest } from '@/lib/auth';
const resolveStudent = vi.mocked(resolveStudentIdFromRequest);

async function callRoute() {
  const { GET } = await import('@/app/api/master/spotlight/route');
  const res = await GET(new NextRequest('http://localhost/api/master/spotlight'));
  return { res, body: await res.json() };
}

beforeEach(() => {
  resolveStudent.mockResolvedValue('student-1' as any);
  process.env.CURIOSITY_PANEL_EMAILS = ALLOWED;
  state.email = ALLOWED;
  state.classes = [{ class_id: 'class-1' }];
  state.classRows = [CLASS_WITH_PLANETS];
  state.activeState = [{ mission_id: 'mission-1' }];
  state.completed = [];
  state.interests = { interests: ['space'] };
  state.seen = [];
  state.edits = [];
  state.throwOn = null;
  writes.length = 0;
});

describe('GET /api/master/spotlight', () => {
  it('returns 401 when the student cannot be resolved', async () => {
    resolveStudent.mockResolvedValue(null as any);
    const { res, body } = await callRoute();
    expect(res.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns nothing at all when the panel is not enabled for this student', async () => {
    state.email = 'someone.else@school.org';
    state.edits = [edit({ id: 'e1' })];
    const { res, body } = await callRoute();
    expect(res.status).toBe(200);
    expect(body).toEqual({ enabled: false, edit: null });
  });

  it('is off for everyone when no allowlist is configured', async () => {
    delete process.env.CURIOSITY_PANEL_EMAILS;
    const { body } = await callRoute();
    expect(body.enabled).toBe(false);
  });

  it('matches the allowlist regardless of case or spacing', async () => {
    process.env.CURIOSITY_PANEL_EMAILS = ` other@x.com , ${ALLOWED.toUpperCase()} `;
    state.edits = [edit({ id: 'e1' })];
    const { body } = await callRoute();
    expect(body.edit.id).toBe('e1');
  });

  it('returns only the fields the panel renders', async () => {
    state.edits = [edit({ id: 'e1' })];
    const { body } = await callRoute();
    expect(body.edit).toEqual({
      id: 'e1',
      edit_type: 'did_you_know',
      hook: 'hook e1',
      media_url: 'https://img/x.jpg',
      media_type: 'image',
      media_credit: 'Someone / Unsplash',
    });
  });

  it('never returns an unpublished edit', async () => {
    state.edits = [edit({ id: 'draft-1', status: 'draft' })];
    const { body } = await callRoute();
    expect(body).toEqual({ enabled: true, edit: null });
  });

  it('prefers the planet the student is on over one further away', async () => {
    state.edits = [edit({ id: 'far', planet_id: 'planet-elsewhere' }), edit({ id: 'here', planet_id: 'planet-1' })];
    const { body } = await callRoute();
    expect(body.edit.id).toBe('here');
  });

  it('still finds an edit for a student with no class at all', async () => {
    state.classes = [];
    state.edits = [edit({ id: 'anywhere', planet_id: 'planet-elsewhere' })];
    const { body } = await callRoute();
    expect(body.edit.id).toBe('anywhere');
  });

  it('degrades to an empty panel instead of failing the home page', async () => {
    state.throwOn = 'feed_edits';
    const { res, body } = await callRoute();
    expect(res.status).toBe(200);
    expect(body).toEqual({ enabled: true, edit: null });
  });

  it('writes nothing — no impression, no session', async () => {
    state.edits = [edit({ id: 'e1' })];
    await callRoute();
    expect(writes).toEqual([]);
  });
});
