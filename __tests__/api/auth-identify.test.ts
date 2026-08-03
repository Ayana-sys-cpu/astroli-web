import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
  for (const method of ['select', 'eq', 'is', 'gt', 'order', 'limit']) {
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

function identifyRequest(inviteCode?: string): Request {
  return new Request('http://localhost/api/auth/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: 'google-access-token', ...(inviteCode ? { inviteCode } : {}) }),
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

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/auth/identify — new Google users', () => {
  // The student app is invite-only: a brand-new email only becomes an account
  // when a parent invited it, or when App Review supplies the reviewer code.
  it('waitlists an uninvited new user instead of creating an account', async () => {
    tableReads.set('users', { single: { data: { id: 'student-uuid' }, error: null } });

    const res = await identifyPOST(identifyRequest() as never);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.reason).toBe('invite_required');

    // No account, no auth session, no demo class — nothing but the waitlist row.
    expect(writes.find((w) => w.table === 'users' && w.method === 'upsert')).toBeUndefined();
    expect(writes.find((w) => w.table === 'student_classes')).toBeUndefined();
    expect(upsertAuthUserAndToken).not.toHaveBeenCalled();

    const waitlisted = writes.find((w) => w.table === 'student_waitlist' && w.method === 'upsert');
    expect(waitlisted?.values).toEqual({
      email: GOOGLE_PROFILE.email,
      provider: 'google',
      first_name: 'Fresh',
    });
  });

  it('lets App Review through with the reviewer code, into the demo class', async () => {
    vi.stubEnv('REVIEWER_INVITE_CODE', 'reviewer-code-123');
    tableReads.set('users', { single: { data: { id: 'student-uuid' }, error: null } });

    const res = await identifyPOST(identifyRequest('reviewer-code-123') as never);
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
    expect(writes.find((w) => w.table === 'student_waitlist')).toBeUndefined();
  });

  it('admits an invited child and links them to the inviting parent', async () => {
    tableReads.set('users', { single: { data: { id: 'student-uuid' }, error: null } });
    tableReads.set('child_invites', {
      maybeSingle: {
        data: { id: 'invite-uuid', parent_id: 'parent-uuid', child_name: 'Invited Kid' },
        error: null,
      },
    });

    const res = await identifyPOST(identifyRequest() as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.role).toBe('student');

    // The invite's name wins over the Google profile name.
    const account = writes.find((w) => w.table === 'users' && w.method === 'upsert');
    expect(account?.values).toMatchObject({ full_name: 'Invited Kid', first_name: 'Invited' });

    const link = writes.find((w) => w.table === 'parent_child_link' && w.method === 'upsert');
    expect(link?.values).toMatchObject({ parent_id: 'parent-uuid', child_id: 'student-uuid' });

    // Invited children join their family class, never the demo class.
    expect(writes.find((w) => w.table === 'student_classes')).toBeUndefined();
    expect(writes.find((w) => w.table === 'student_waitlist')).toBeUndefined();
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
