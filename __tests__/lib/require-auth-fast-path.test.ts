import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { VERIFIED_USER_HEADER, encodeVerifiedUserHeader } from '@/lib/verified-user-header';

const SECRET = 'test-service-role-secret';
process.env.SUPABASE_SERVICE_ROLE_KEY = SECRET;

// Request headers seen by requireAuth() — mutated per test.
let requestHeaders = new Headers();

vi.mock('next/headers', () => ({
  headers: () => requestHeaders,
}));

// Cookie-session getUser spy — the network round trip the fast path must skip.
const cookieGetUser = vi.fn();

vi.mock('@/lib/supabase-server', () => ({
  createSSRServerClient: () => ({ auth: { getUser: () => cookieGetUser() } }),
  supabaseAdmin: {},
}));

import { requireAuth } from '@/lib/auth';

function verifiedUser(): User {
  return {
    id: 'auth-user-1',
    aud: 'authenticated',
    email: 'teacher@example.com',
    created_at: '2026-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: { role: 'teacher', teacher_id: 'teacher-1' },
  } as User;
}

beforeEach(() => {
  requestHeaders = new Headers();
  cookieGetUser.mockReset();
  cookieGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') });
});

describe('requireAuth — middleware-verified header fast path', () => {
  it('returns the header user without a second Supabase Auth call', async () => {
    requestHeaders.set(VERIFIED_USER_HEADER, await encodeVerifiedUserHeader(verifiedUser(), SECRET));

    const auth = await requireAuth();

    expect(auth.ok).toBe(true);
    if (auth.ok) expect(auth.user).toEqual(verifiedUser());
    expect(cookieGetUser).not.toHaveBeenCalled();
  });

  it('falls back to getUser() when no header is present (mobile / public routes)', async () => {
    cookieGetUser.mockResolvedValue({ data: { user: verifiedUser() }, error: null });

    const auth = await requireAuth();

    expect(auth.ok).toBe(true);
    expect(cookieGetUser).toHaveBeenCalledTimes(1);
  });

  it('ignores a forged header and falls back to getUser()', async () => {
    requestHeaders.set(
      VERIFIED_USER_HEADER,
      await encodeVerifiedUserHeader(verifiedUser(), 'attacker-known-secret'),
    );

    const auth = await requireAuth();

    expect(auth.ok).toBe(false);
    expect(cookieGetUser).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when neither header nor cookie session is valid', async () => {
    const auth = await requireAuth();

    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(401);
  });
});
