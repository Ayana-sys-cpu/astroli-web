import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateKeyPairSync, createSign } from 'node:crypto';

// ── supabaseAdmin chain mock ─────────────────────────────────────────────────
// Same shape as auth-identify.test.ts, with one addition: reads can be keyed by
// `table.column` as well as by table. The Apple route looks up `users` twice —
// once by apple_user_id, once by email — and the two must be able to differ.

type ReadResult = { data: Record<string, unknown> | null; error: unknown };

const tableReads = new Map<string, { maybeSingle?: ReadResult; single?: ReadResult }>();
const writes: Array<{ table: string; method: string; values: unknown }> = [];

function makeChain(table: string) {
  const eqColumns: string[] = [];
  const reads = () =>
    eqColumns.map((col) => tableReads.get(`${table}.${col}`)).find(Boolean) ??
    tableReads.get(table) ??
    {};

  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'is', 'gt', 'order', 'limit']) {
    chain[method] = () => chain;
  }
  chain.eq = (column: string) => {
    eqColumns.push(column);
    return chain;
  };
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

import { POST as applePOST } from '@/app/api/auth/apple/route';
import { DEMO_CLASS_ID, DEMO_CLASS_JOURNEY_ID } from '@/lib/demo-class';

// ── Real RS256 tokens ────────────────────────────────────────────────────────
// The route verifies signatures with node:crypto against Apple's published
// JWKS, so the tests sign genuine tokens with a throwaway key and serve the
// matching public key from a stubbed JWKS endpoint. Verification is exercised
// for real — a token that shouldn't validate genuinely doesn't.

const KEY_ID = 'test-key-1';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = publicKey.export({ format: 'jwk' }) as { n: string; e: string };

const STUDENT_APP_AUDIENCE = 'com.ayanar.astroli';
const FEED_APP_AUDIENCE = 'com.ayanar.astrolifeed';
const APPLE_SUB = 'apple-sub-000123';
const APPLE_EMAIL = 'fresh.reviewer@privaterelay.appleid.com';

function b64url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function appleToken(overrides: {
  aud?: string;
  sub?: string;
  email?: string | null;
  exp?: number;
  iss?: string;
  kid?: string;
} = {}): string {
  const header = { alg: 'RS256', kid: overrides.kid ?? KEY_ID };
  const payload = {
    iss: overrides.iss ?? 'https://appleid.apple.com',
    aud: overrides.aud ?? STUDENT_APP_AUDIENCE,
    sub: overrides.sub ?? APPLE_SUB,
    exp: overrides.exp ?? Math.floor(Date.now() / 1000) + 3600,
    ...(overrides.email === null ? {} : { email: overrides.email ?? APPLE_EMAIL }),
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(privateKey);
  return `${signingInput}.${signature.toString('base64url')}`;
}

function appleRequest(body: Record<string, unknown> = {}): Request {
  return new Request('http://localhost/api/auth/apple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identityToken: appleToken(), ...body }),
  });
}

const STUDENT_ROW = {
  id: 'student-uuid',
  role: 'student',
  email: APPLE_EMAIL,
  first_name: 'Fresh',
  base_avatar_url: null,
  avatar_url: null,
  alien_name: null,
  apple_user_id: APPLE_SUB,
};

beforeEach(() => {
  tableReads.clear();
  writes.length = 0;
  upsertAuthUserAndToken.mockReset();
  upsertAuthUserAndToken.mockResolvedValue({ authToken: 'minted-token', authUserId: 'auth-uuid' });
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL) => {
    if (String(url).includes('appleid.apple.com/auth/keys')) {
      return new Response(
        JSON.stringify({
          keys: [{ kid: KEY_ID, kty: 'RSA', alg: 'RS256', use: 'sig', n: publicJwk.n, e: publicJwk.e }],
        }),
        { status: 200 },
      );
    }
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/auth/apple — token verification', () => {
  it('rejects a tampered signature', async () => {
    const [header, payload, signature] = appleToken().split('.');
    const flipped = signature[0] === 'A' ? `B${signature.slice(1)}` : `A${signature.slice(1)}`;

    const res = await applePOST(
      new Request('http://localhost/api/auth/apple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityToken: `${header}.${payload}.${flipped}` }),
      }) as never,
    );

    expect(res.status).toBe(401);
    expect(writes).toHaveLength(0);
  });

  it('rejects an expired token', async () => {
    const res = await applePOST(
      appleRequest({ identityToken: appleToken({ exp: Math.floor(Date.now() / 1000) - 60 }) }) as never,
    );

    expect(res.status).toBe(401);
    expect(writes).toHaveLength(0);
  });

  it('rejects a token minted for someone else’s app', async () => {
    const res = await applePOST(
      appleRequest({ identityToken: appleToken({ aud: 'com.someone.else' }) }) as never,
    );

    expect(res.status).toBe(401);
    expect(writes).toHaveLength(0);
  });

  it('rejects a token from the wrong issuer', async () => {
    const res = await applePOST(
      appleRequest({ identityToken: appleToken({ iss: 'https://evil.example.com' }) }) as never,
    );

    expect(res.status).toBe(401);
    expect(writes).toHaveLength(0);
  });
});

describe('POST /api/auth/apple — the invite gate', () => {
  // The student app is invite-only: a child account is only created when a
  // parent invited that email, or when App Review supplies the reviewer code.
  it('waitlists an uninvited new user instead of creating an account', async () => {
    const res = await applePOST(appleRequest() as never);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.reason).toBe('invite_required');

    expect(writes.find((w) => w.table === 'users')).toBeUndefined();
    expect(writes.find((w) => w.table === 'student_classes')).toBeUndefined();
    expect(upsertAuthUserAndToken).not.toHaveBeenCalled();

    const waitlisted = writes.find((w) => w.table === 'student_waitlist' && w.method === 'upsert');
    expect(waitlisted?.values).toEqual({
      email: APPLE_EMAIL,
      provider: 'apple',
      first_name: null,
    });
  });

  it('lets App Review through with the reviewer code, into the demo class', async () => {
    vi.stubEnv('REVIEWER_INVITE_CODE', 'reviewer-code-123');
    tableReads.set('users', { single: { data: STUDENT_ROW, error: null } });

    const res = await applePOST(appleRequest({ inviteCode: 'reviewer-code-123' }) as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.exists).toBe(false);
    expect(body.studentId).toBe('student-uuid');
    expect(body.authToken).toBe('minted-token');

    const enrollment = writes.find((w) => w.table === 'student_classes' && w.method === 'insert');
    expect(enrollment?.values).toEqual({
      student_id: 'student-uuid',
      class_id: DEMO_CLASS_ID,
      template_journey_id: DEMO_CLASS_JOURNEY_ID,
    });
    expect(writes.find((w) => w.table === 'student_waitlist')).toBeUndefined();
  });

  it('admits an invited child and links them to the inviting parent', async () => {
    tableReads.set('users', { single: { data: STUDENT_ROW, error: null } });
    tableReads.set('child_invites', {
      maybeSingle: {
        data: { id: 'invite-uuid', parent_id: 'parent-uuid', child_name: 'Invited Kid' },
        error: null,
      },
    });

    const res = await applePOST(appleRequest() as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.exists).toBe(false);

    // The invite's name wins over whatever the client forwarded.
    const account = writes.find((w) => w.table === 'users' && w.method === 'insert');
    expect(account?.values).toMatchObject({ full_name: 'Invited Kid', apple_user_id: APPLE_SUB });

    const link = writes.find((w) => w.table === 'parent_child_link' && w.method === 'upsert');
    expect(link?.values).toMatchObject({ parent_id: 'parent-uuid', child_id: 'student-uuid' });

    // Invited children join their family class, never the demo class.
    expect(writes.find((w) => w.table === 'student_classes')).toBeUndefined();
    expect(writes.find((w) => w.table === 'student_waitlist')).toBeUndefined();
  });

  // The standalone Feed app shares this route but is a separate, open product.
  // Gating it would break sign-in for an app that has no invite flow at all.
  it('does not invite-gate the Feed app', async () => {
    tableReads.set('users', { single: { data: STUDENT_ROW, error: null } });

    const res = await applePOST(
      appleRequest({ identityToken: appleToken({ aud: FEED_APP_AUDIENCE }) }) as never,
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.exists).toBe(false);
    expect(writes.find((w) => w.table === 'users' && w.method === 'insert')).toBeDefined();
    expect(writes.find((w) => w.table === 'student_waitlist')).toBeUndefined();
  });
});

describe('POST /api/auth/apple — existing accounts', () => {
  it('signs a returning student in without re-running the gate', async () => {
    tableReads.set('users.apple_user_id', {
      maybeSingle: { data: { ...STUDENT_ROW, alien_name: 'Zorb' }, error: null },
    });

    const res = await applePOST(appleRequest() as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.exists).toBe(true);
    expect(body.onboardingComplete).toBe(true);
    expect(body.alienName).toBe('Zorb');
    expect(body.studentId).toBe('student-uuid');

    // No new account, no gate side effects, no re-enrollment.
    expect(writes.find((w) => w.table === 'users' && w.method === 'insert')).toBeUndefined();
    expect(writes.find((w) => w.table === 'student_classes')).toBeUndefined();
    expect(writes.find((w) => w.table === 'student_waitlist')).toBeUndefined();
  });

  it('links the Apple ID on a first Apple sign-in to an existing email account', async () => {
    tableReads.set('users.email', {
      maybeSingle: { data: { ...STUDENT_ROW, apple_user_id: null }, error: null },
    });

    const res = await applePOST(appleRequest() as never);

    expect(res.status).toBe(200);
    expect((await res.json()).exists).toBe(true);

    const link = writes.find((w) => w.table === 'users' && w.method === 'update');
    expect(link?.values).toEqual({ apple_user_id: APPLE_SUB });
    expect(writes.find((w) => w.table === 'student_waitlist')).toBeUndefined();
  });

  it('turns a parent account away to the web app', async () => {
    tableReads.set('users.apple_user_id', {
      maybeSingle: { data: { ...STUDENT_ROW, role: 'parent' }, error: null },
    });

    const res = await applePOST(appleRequest() as never);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(JSON.stringify(body)).toMatch(/web app/i);
    expect(upsertAuthUserAndToken).not.toHaveBeenCalled();
  });

  it('fails closed when the account lookup errors', async () => {
    tableReads.set('users.apple_user_id', {
      maybeSingle: { data: null, error: { message: 'db down' } },
    });

    const res = await applePOST(appleRequest() as never);

    expect(res.status).toBe(503);
    expect(writes.find((w) => w.table === 'users')).toBeUndefined();
    expect(writes.find((w) => w.table === 'student_waitlist')).toBeUndefined();
  });
});
