import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  resolveStudentIdFromRequest: vi.fn(),
}));

interface EditRow {
  id: string;
  edit_type: string;
  planet_id: string;
  interest_theme: string | null;
  hook: string;
  body: string;
  bridge: string;
  media_url: string;
  media_type: string;
  media_credit: string;
  status: string;
  created_at: string;
}

function edit(over: Partial<EditRow> & { id: string }): EditRow {
  return {
    edit_type: 'did_you_know',
    planet_id: 'planet-off-journey',
    interest_theme: null,
    hook: `hook ${over.id}`,
    body: 'body',
    bridge: 'bridge',
    media_url: 'https://img/x.jpg',
    media_type: 'image',
    media_credit: 'Someone / Unsplash',
    status: 'live',
    created_at: '2026-07-01T00:00:00Z',
    ...over,
  };
}

const state = {
  classes: [{ class_id: 'class-1' }] as any[],
  missions: [{ mission_id: 'mission-1' }] as any[],
  planets: [{ id: 'planet-1' }, { id: 'planet-2' }] as any[],
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

      const filters: { status?: string; planetIds?: string[] } = {};

      const rowsFor = (): any[] => {
        switch (table) {
          case 'student_classes': return state.classes;
          case 'class_mission_state': return state.missions;
          case 'planets': return state.planets;
          case 'students': return [state.interests];
          case 'feed_events': return state.seen;
          case 'feed_edits': {
            let rows = state.edits.filter((e) => e.status === (filters.status ?? 'live'));
            if (filters.planetIds) rows = rows.filter((e) => filters.planetIds!.includes(e.planet_id));
            return rows;
          }
          default: return [];
        }
      };

      const builder: any = {
        select: () => builder,
        eq: (col: string, value: string) => {
          if (col === 'status') filters.status = value;
          return builder;
        },
        in: (col: string, values: string[]) => {
          if (col === 'planet_id') filters.planetIds = values;
          return builder;
        },
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

const request = () => new NextRequest('http://localhost/api/master/spotlight');

async function callRoute() {
  const { GET } = await import('@/app/api/master/spotlight/route');
  const res = await GET(request());
  return { res, body: await res.json() };
}

beforeEach(() => {
  resolveStudent.mockResolvedValue('student-1' as any);
  state.classes = [{ class_id: 'class-1' }];
  state.missions = [{ mission_id: 'mission-1' }];
  state.planets = [{ id: 'planet-1' }, { id: 'planet-2' }];
  state.interests = { interests: ['space'] };
  state.seen = [];
  state.edits = [];
  state.throwOn = null;
  writes.length = 0;
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

describe('GET /api/master/spotlight', () => {
  it('returns 401 when the student cannot be resolved', async () => {
    resolveStudent.mockResolvedValue(null as any);
    const { res, body } = await callRoute();
    expect(res.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns a null edit when nothing is live', async () => {
    state.edits = [edit({ id: 'draft-1', planet_id: 'planet-1', status: 'draft' })];
    const { res, body } = await callRoute();
    expect(res.status).toBe(200);
    expect(body).toEqual({ edit: null });
  });

  it('returns only the fields the panel renders', async () => {
    state.edits = [edit({ id: 'e1', planet_id: 'planet-1' })];
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

  it('never returns an edit the student has already seen', async () => {
    state.edits = [edit({ id: 'seen-1', planet_id: 'planet-1' })];
    state.seen = [{ edit_id: 'seen-1' }];
    const { body } = await callRoute();
    expect(body).toEqual({ edit: null });
  });

  it('prefers an edit on the student’s journey over one off it', async () => {
    state.edits = [
      edit({ id: 'off-journey', planet_id: 'planet-9' }),
      edit({ id: 'on-journey', planet_id: 'planet-1' }),
    ];
    const { body } = await callRoute();
    expect(body.edit.id).toBe('on-journey');
  });

  it('falls back to any live edit when the journey has none', async () => {
    state.edits = [edit({ id: 'elsewhere', planet_id: 'planet-9' })];
    const { body } = await callRoute();
    expect(body.edit.id).toBe('elsewhere');
  });

  it('falls back to any live edit when the student has no active mission', async () => {
    state.missions = [];
    state.edits = [edit({ id: 'elsewhere', planet_id: 'planet-9' })];
    const { body } = await callRoute();
    expect(body.edit.id).toBe('elsewhere');
  });

  it('prefers an edit matching the declared interest', async () => {
    state.planets = [];
    state.missions = [];
    state.edits = [
      edit({ id: 'other', interest_theme: 'cooking' }),
      edit({ id: 'space-one', interest_theme: 'space' }),
    ];
    const { body } = await callRoute();
    expect(body.edit.id).toBe('space-one');
  });

  it('degrades to an empty panel instead of failing the home page', async () => {
    state.throwOn = 'feed_edits';
    const { res, body } = await callRoute();
    expect(res.status).toBe(200);
    expect(body).toEqual({ edit: null });
  });

  it('writes nothing — no impression, no session', async () => {
    state.edits = [edit({ id: 'e1', planet_id: 'planet-1' })];
    await callRoute();
    expect(writes).toEqual([]);
  });
});
