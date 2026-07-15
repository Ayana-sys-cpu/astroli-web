import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  resolveStudentIdFromRequest: vi.fn(),
}));

const latestSessionResult = { data: null as any };
const insertCalls: any[] = [];
const updateCalls: any[] = [];
const insertError = { current: null as any };

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => {
      const builder: any = {
        select:      () => builder,
        eq:          () => builder,
        order:       () => builder,
        limit:       () => builder,
        maybeSingle: () => Promise.resolve({ data: latestSessionResult.data }),
        update: (values: any) => {
          updateCalls.push(values);
          return { eq: () => Promise.resolve({ error: null }) };
        },
        insert: (values: any) => {
          insertCalls.push(values);
          return Promise.resolve({ error: insertError.current });
        },
      };
      return builder;
    }),
  },
}));

import { resolveStudentIdFromRequest } from '@/lib/auth';
const resolveStudentMock = vi.mocked(resolveStudentIdFromRequest);

function pingRequest(body: unknown = { platform: 'web' }) {
  return new NextRequest('http://localhost/api/activity/ping', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

async function callPing(body?: unknown) {
  const { POST } = await import('@/app/api/activity/ping/route');
  return POST(pingRequest(body));
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

describe('POST /api/activity/ping', () => {
  beforeEach(() => {
    resolveStudentMock.mockReset();
    resolveStudentMock.mockResolvedValue('student-1');
    latestSessionResult.data = null;
    insertCalls.length = 0;
    updateCalls.length = 0;
    insertError.current = null;
  });

  it('treats a dangling student id (FK violation on insert) as non-trackable instead of erroring', async () => {
    // A session can outlive its users row (e.g. deleted test account) —
    // user_metadata.student_id then points at nothing and the insert 23503s.
    insertError.current = { code: '23503', message: 'violates foreign key constraint' };

    const res = await callPing({ platform: 'web' });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ tracked: false });
  });

  it('is a no-op for authenticated non-student sessions and tells the client to stop', async () => {
    resolveStudentMock.mockResolvedValue(null);

    const res = await callPing();
    const body = await res.json();

    expect(body).toEqual({ tracked: false });
    expect(insertCalls).toHaveLength(0);
    expect(updateCalls).toHaveLength(0);
  });

  it('opens a new session when the student has none', async () => {
    const res = await callPing({ platform: 'web' });
    const body = await res.json();

    expect(body).toEqual({ tracked: true });
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({ student_id: 'student-1', platform: 'web' });
    expect(updateCalls).toHaveLength(0);
  });

  it('stitches a ping into the current session when the last ping is under 30 minutes old', async () => {
    latestSessionResult.data = { id: 'session-1', last_ping_at: minutesAgo(5), ping_count: 3 };

    const res = await callPing({ platform: 'web' });
    const body = await res.json();

    expect(body).toEqual({ tracked: true });
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toMatchObject({ ping_count: 4 });
    expect(insertCalls).toHaveLength(0);
  });

  it('opens a new session when the last ping is 30+ minutes old', async () => {
    latestSessionResult.data = { id: 'session-1', last_ping_at: minutesAgo(31), ping_count: 8 };

    await callPing({ platform: 'web' });

    expect(insertCalls).toHaveLength(1);
    expect(updateCalls).toHaveLength(0);
  });

  it('defaults platform to web when the body is empty', async () => {
    await callPing({});

    expect(insertCalls[0]).toMatchObject({ platform: 'web' });
  });

  it('rejects an unknown platform', async () => {
    const res = await callPing({ platform: 'smartwatch' });

    expect(res.status).toBe(400);
    expect(insertCalls).toHaveLength(0);
  });
});
