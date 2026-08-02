import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  resolveStudentIdFromRequest: vi.fn(),
}));

vi.mock('@/lib/orin-dive', () => ({
  askOrin: vi.fn(),
}));

const state = {
  session: { id: 'dive-1', topic: 'Octopus hearts', edit_id: null as string | null } as any,
  firstMessage: null as any,
  edit: null as any,
};

const inserted: any[] = [];

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      const rowsFor = (): any[] => {
        switch (table) {
          case 'master_dive_sessions': return state.session ? [state.session] : [];
          case 'master_dive_messages': return state.firstMessage ? [state.firstMessage] : [];
          case 'feed_edits': return state.edit ? [state.edit] : [];
          default: return [];
        }
      };
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: () => Promise.resolve({ data: rowsFor()[0] ?? null }),
        insert: (v: unknown) => { inserted.push({ table, v }); return Promise.resolve({ error: null }); },
        then: (resolve: (r: { data: any[] }) => unknown) => Promise.resolve({ data: rowsFor() }).then(resolve),
      };
      return builder;
    }),
  },
}));

import { resolveStudentIdFromRequest } from '@/lib/auth';
import { askOrin } from '@/lib/orin-dive';
const resolveStudent = vi.mocked(resolveStudentIdFromRequest);
const orin = vi.mocked(askOrin);

const SEGMENTS = [{ type: 'text', text: 'Three hearts, two for the gills.' }];

async function callRoute() {
  const { POST } = await import('@/app/api/master/dive/[id]/opening/route');
  const res = await POST(
    new NextRequest('http://localhost/api/master/dive/dive-1/opening', { method: 'POST' }),
    { params: { id: 'dive-1' } },
  );
  return { res, body: await res.json() };
}

beforeEach(() => {
  resolveStudent.mockResolvedValue('student-1' as any);
  state.session = { id: 'dive-1', topic: 'Octopus hearts', edit_id: null };
  state.firstMessage = null;
  state.edit = null;
  orin.mockClear();
  orin.mockResolvedValue(SEGMENTS as any);
  inserted.length = 0;
});

describe('POST /api/master/dive/[id]/opening', () => {
  it('writes Orin’s first message and returns it', async () => {
    const { res, body } = await callRoute();
    expect(res.status).toBe(201);
    expect(body.segments).toEqual(SEGMENTS);
    expect(inserted).toHaveLength(1);
  });

  it('returns the existing opening instead of writing a second one', async () => {
    state.firstMessage = { segments: SEGMENTS };
    const { res, body } = await callRoute();
    expect(res.status).toBe(200);
    expect(body.segments).toEqual(SEGMENTS);
    expect(inserted).toHaveLength(0);
    expect(orin).not.toHaveBeenCalled();
  });

  it('opens on the edit’s own picture when the dive started from one', async () => {
    state.session.edit_id = 'edit-1';
    state.edit = { hook: 'Octopuses have three hearts.', media_url: 'https://img/o.jpg', media_type: 'image', media_credit: 'Someone' };
    await callRoute();
    expect(orin.mock.calls[0][0].editMedia).toMatchObject({ url: 'https://img/o.jpg', kind: 'image' });
  });

  it('hands Orin the whole story, not just the headline', async () => {
    state.session.edit_id = 'edit-1';
    state.edit = {
      hook: 'He rewrote how we read DNA.',
      body: 'Har Gobind Khorana grew up in a village with no electricity.',
      bridge: 'Every genome sequenced today leans on his work.',
      media_url: null,
      media_type: 'image',
      media_credit: 'Someone',
    };
    await callRoute();
    expect(orin.mock.calls[0][0].source).toEqual({
      hook: 'He rewrote how we read DNA.',
      body: 'Har Gobind Khorana grew up in a village with no electricity.',
      bridge: 'Every genome sequenced today leans on his work.',
    });
  });

  it('gives Orin no source card for a dive that started from a question', async () => {
    await callRoute();
    expect(orin.mock.calls[0][0].source).toBeNull();
  });

  it('says Orin is recharging when he cannot answer', async () => {
    orin.mockResolvedValue(null);
    const { res, body } = await callRoute();
    expect(res.status).toBe(503);
    expect(body.error).toBe('orin_recharging');
    expect(inserted).toHaveLength(0);
  });

  it('refuses a dive that is not this student’s', async () => {
    state.session = null;
    const { res } = await callRoute();
    expect(res.status).toBe(404);
  });

  it('returns 401 when the student cannot be resolved', async () => {
    resolveStudent.mockResolvedValue(null as any);
    const { res } = await callRoute();
    expect(res.status).toBe(401);
  });
});
