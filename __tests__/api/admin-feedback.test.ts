import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const adminResult = { ok: true as boolean };
vi.mock('@/lib/admin-auth', () => ({
  requireAdmin: vi.fn(async () =>
    adminResult.ok
      ? { ok: true, user: { email: 'founder@example.com' } }
      : { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) },
  ),
}));

const insertCalls: any[] = [];
const updateCalls: any[] = [];
const deleteCalls: any[] = [];
const rowResult = { data: null as any, error: null as any };

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => {
      const builder: any = {
        insert: (values: any) => { insertCalls.push(values); return builder; },
        update: (values: any) => { updateCalls.push(values); return builder; },
        delete: () => { deleteCalls.push(true); return builder; },
        select: () => builder,
        eq:     () => builder,
        single: () => Promise.resolve({ data: rowResult.data, error: rowResult.error }),
        then:   (resolve: any) => resolve({ data: [], error: null }),
      };
      return builder;
    }),
  },
}));

function jsonRequest(url: string, method: string, body: unknown) {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

async function callCreate(body: unknown) {
  const { POST } = await import('@/app/api/admin/feedback/route');
  return POST(jsonRequest('http://localhost/api/admin/feedback', 'POST', body));
}

async function callUpdate(body: unknown) {
  const { PATCH } = await import('@/app/api/admin/feedback/[id]/route');
  return PATCH(
    jsonRequest('http://localhost/api/admin/feedback/f-1', 'PATCH', body),
    { params: { id: 'f-1' } },
  );
}

describe('admin feedback routes', () => {
  // Route modules transform slowly on a busy machine; pay the load cost once
  // here instead of inside the first test's 5s budget.
  beforeAll(async () => {
    await import('@/app/api/admin/feedback/route');
    await import('@/app/api/admin/feedback/[id]/route');
  }, 60_000);

  beforeEach(() => {
    adminResult.ok = true;
    insertCalls.length = 0;
    updateCalls.length = 0;
    deleteCalls.length = 0;
    rowResult.data = null;
    rowResult.error = null;
  });

  it('POST rejects non-admin sessions', async () => {
    adminResult.ok = false;
    const res = await callCreate({ content: 'Great app!' });
    expect(res.status).toBe(403);
    expect(insertCalls).toHaveLength(0);
  });

  it('POST rejects empty content', async () => {
    const res = await callCreate({ content: '   ' });
    expect(res.status).toBe(400);
    expect(insertCalls).toHaveLength(0);
  });

  it('POST inserts with defaults and returns the created entry', async () => {
    rowResult.data = {
      id: 'f-1', student_id: null, source: 'other', content: 'Great app!',
      status: 'new', tags: [], action_notes: null,
      created_at: '2026-07-15T12:00:00Z', updated_at: '2026-07-15T12:00:00Z',
    };

    const res = await callCreate({ content: 'Great app!' });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(insertCalls[0]).toMatchObject({ content: 'Great app!', source: 'other', student_id: null, tags: [] });
    expect(body.feedback).toMatchObject({ id: 'f-1', status: 'new', content: 'Great app!' });
  });

  it('PATCH passes through changed fields and stamps updated_at', async () => {
    rowResult.data = {
      id: 'f-1', student_id: null, source: 'other', content: 'Great app!',
      status: 'reviewed', tags: [], action_notes: 'Called the parent',
      created_at: '2026-07-15T12:00:00Z', updated_at: '2026-07-15T13:00:00Z',
    };

    const res = await callUpdate({ status: 'reviewed', actionNotes: 'Called the parent' });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(updateCalls[0]).toMatchObject({ status: 'reviewed', action_notes: 'Called the parent' });
    expect(typeof updateCalls[0].updated_at).toBe('string');
    expect(body.feedback.status).toBe('reviewed');
  });

  it('PATCH rejects a body with no updatable fields', async () => {
    const res = await callUpdate({});
    expect(res.status).toBe(400);
    expect(updateCalls).toHaveLength(0);
  });
});
