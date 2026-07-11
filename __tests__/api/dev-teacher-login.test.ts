import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Call-order log — two prior failure modes drive these contracts:
// 1. updateUserById BEFORE generateLink invalidated the fresh OTP (otp_expired),
//    so the stamp must happen AFTER verifyOtp consumes the token.
// 2. Finding the auth user via admin listUsers silently skipped the stamp when
//    that API flaked (500s), so the stamp must target verifyOtp's returned user.
let calls: string[] = [];

const updateUserById = vi.fn(async () => { calls.push('updateUserById'); return { data: {}, error: null }; });
const generateLink = vi.fn(async () => {
  calls.push('generateLink');
  return { data: { properties: { hashed_token: 'hashed-token-123' } }, error: null };
});
const verifyOtp = vi.fn(async () => {
  calls.push('verifyOtp');
  return {
    data: {
      session: { access_token: 'access-jwt', refresh_token: 'refresh-jwt' },
      user: { id: 'auth-user-1' },
    },
    error: null,
  };
});
const refreshSession = vi.fn(async () => {
  calls.push('refreshSession');
  return {
    data: { session: { access_token: 'teacher-jwt', refresh_token: 'teacher-refresh' } },
    error: null,
  };
});
const setSession = vi.fn(async () => { calls.push('setSession'); return { data: {}, error: null }; });

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        updateUserById: (...args: unknown[]) => updateUserById(...args),
        generateLink: (...args: unknown[]) => generateLink(...args),
      },
    },
    from: () => {
      const builder: Record<string, unknown> = {};
      builder.update = () => builder;
      builder.eq = async () => ({ data: null, error: null });
      return builder;
    },
  },
  supabaseAnon: {
    auth: {
      verifyOtp: (...args: unknown[]) => verifyOtp(...args),
      refreshSession: (...args: unknown[]) => refreshSession(...args),
    },
  },
  createSSRServerClient: () => ({
    auth: { setSession: (...args: unknown[]) => setSession(...args) },
  }),
}));

import { GET } from '@/app/api/auth/dev-teacher-login/route';

const request = () => new NextRequest('http://localhost:3014/api/auth/dev-teacher-login');

beforeEach(() => {
  calls = [];
  for (const mock of [updateUserById, generateLink, verifyOtp, refreshSession, setSession]) mock.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/auth/dev-teacher-login', () => {
  it('stamps teacher metadata on the verified user AFTER consuming the OTP', async () => {
    await GET(request());
    expect(calls.indexOf('verifyOtp')).toBeLessThan(calls.indexOf('updateUserById'));
    expect(updateUserById).toHaveBeenCalledWith('auth-user-1', {
      user_metadata: expect.objectContaining({ role: 'teacher', parent_id: null }),
    });
  });

  it('verifies the OTP server-side — never redirects the browser through Supabase', async () => {
    await GET(request());
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'magiclink', token_hash: 'hashed-token-123' });
  });

  it('refreshes the session after stamping and persists the refreshed (teacher) tokens', async () => {
    await GET(request());
    expect(calls.indexOf('updateUserById')).toBeLessThan(calls.indexOf('refreshSession'));
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'teacher-jwt',
      refresh_token: 'teacher-refresh',
    });
  });

  it('falls back to the original tokens if the refresh fails (getUser paths still see teacher)', async () => {
    refreshSession.mockResolvedValueOnce({ data: { session: null }, error: { message: 'flaky' } } as never);
    const response = await GET(request());
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'access-jwt',
      refresh_token: 'refresh-jwt',
    });
    expect(response.headers.get('location')).toBe('http://localhost:3014/teacher');
  });

  it('redirects to /teacher on the same origin as the request (works on any dev port)', async () => {
    const response = await GET(request());
    expect(response.status).toBeGreaterThanOrEqual(302);
    expect(response.status).toBeLessThan(308);
    expect(response.headers.get('location')).toBe('http://localhost:3014/teacher');
  });

  it('returns 500 with detail when link generation fails', async () => {
    generateLink.mockResolvedValueOnce({ data: null, error: { message: 'boom' } } as never);
    const response = await GET(request());
    expect(response.status).toBe(500);
  });

  it('returns 500 when OTP verification fails', async () => {
    verifyOtp.mockResolvedValueOnce({ data: { session: null, user: null }, error: { message: 'expired' } } as never);
    const response = await GET(request());
    expect(response.status).toBe(500);
  });

  it('is disabled in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = await GET(request());
    expect(response.status).toBe(403);
    expect(generateLink).not.toHaveBeenCalled();
  });
});
