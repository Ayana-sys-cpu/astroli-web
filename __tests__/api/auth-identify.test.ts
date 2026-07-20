import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── supabaseAdmin chain mock ─────────────────────────────────────────────────
// Each from(table) returns a chain whose reads resolve from `tableReads` and
// whose writes are recorded in `writes`. The chain is itself thenable so bare
// `await from(t).update(...).eq(...)` / `.insert(...)` calls resolve to
// { data: null, error: null }.

type ReadResult = { data: Record<string, unknown> | null; error: unknown };

const tableReads = new Map<string, { maybeSingle?: ReadResult; single?: ReadResult }>();
const writes: Array<{ table: string; method: string; values: unknown }> = [];

function makeChain(table: string) {
  const reads = () => tableReads.get(table) ?? {};
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq']) {
    chain[method] = () => chain;
  }
  for (const method of ['insert', 'upsert', 'update']) {
    chain[method] = (values: unknown) => {
      writes.push({ table, method, values });
      return chain;
    };
  }
  chain.maybeSingle = async () => reads().maybeSingle ?? { data: null, error: null };
  chain.single = async () => reads().single ?? { data: null, error: null };
  chain.then = (resolve: (value: unknown) => void) => resolve({ data: null, error: null });
  return chain;
}

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: { from: (table: string) => makeChain(table) },
}));

const upsertAuthUserAndToken = vi.fn();
vi.mock('@/lib/auth-token', () => ({
  upsertAuthUserAndToken: (...args: unknown[]) => upsertAuthUserAndToken(...args),
}));

import { POST as identifyPOST } from '@/app/api/auth/identify/route';
import { DEMO_CLASS_ID, DEMO_CLASS_JOURNEY_ID } from '@/lib/demo-class';

const GOOGLE_PROFILE = { id: 'google-123', email: 'fresh.reviewer@example.com', name: 'Fresh Reviewer' };

function identifyRequest(): Request {
  return new Request('http://localhost/api/auth/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: 'google-access-token' }),
  });
}

beforeEach(() => {
  tableReads.clear();
  writes.length = 0;
  upsertAuthUserAndToken.mockReset();
  upsertAuthUserAndToken.mockResolvedValue({ authToken: 'minted-token', authUserId: 'auth-uuid' });
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL) => {
    if (String(url).includes('googleapis.com/userinfo')) {
      return new Response(JSON.stringify(GOOGLE_PROFILE), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

describe('POST /api/auth/identify — new Google users', () => {
  it('creates a student account with the demo class instead of waitlisting', async () => {
    tableReads.set('users', { single: { data: { id: 'student-uuid' }, error: null } });

    const res = await identifyPOST(identifyRequest() as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.role).toBe('student');
    expect(body.userId).toBe('student-uuid');
    expect(body.authToken).toBe('minted-token');
    expect(JSON.stringify(body)).not.toMatch(/early access/i);

    const enrollment = writes.find((w) => w.table === 'student_classes' && w.method === 'insert');
    expect(enrollment?.values).toEqual({
      student_id: 'student-uuid',
      class_id: DEMO_CLASS_ID,
      template_journey_id: DEMO_CLASS_JOURNEY_ID,
    });
    expect(writes.find((w) => w.table === 'parent_waitlist')).toBeUndefined();
  });

  it('signs an existing student in without re-enrolling the demo class', async () => {
    tableReads.set('users', {
      maybeSingle: { data: { role: 'student' }, error: null },
      single: { data: { id: 'student-uuid' }, error: null },
    });

    const res = await identifyPOST(identifyRequest() as never);

    expect(res.status).toBe(200);
    expect((await res.json()).role).toBe('student');
    expect(writes.find((w) => w.table === 'student_classes')).toBeUndefined();
  });

  it('routes an existing parent account to the web app, with no beta wording', async () => {
    tableReads.set('users', { maybeSingle: { data: { role: 'parent' }, error: null } });

    const res = await identifyPOST(identifyRequest() as never);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(JSON.stringify(body)).toMatch(/web app/i);
    expect(JSON.stringify(body)).not.toMatch(/early access|waitlist/i);
    expect(writes.find((w) => w.table === 'parent_waitlist')).toBeUndefined();
  });

  it('fails closed when the account lookup errors — never risks a role flip', async () => {
    tableReads.set('users', { maybeSingle: { data: null, error: { message: 'db down' } } });

    const res = await identifyPOST(identifyRequest() as never);

    expect(res.status).toBe(503);
    expect(writes.find((w) => w.table === 'users' && w.method === 'upsert')).toBeUndefined();
  });
});
