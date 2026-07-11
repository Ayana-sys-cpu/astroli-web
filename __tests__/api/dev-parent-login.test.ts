import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Same contracts as dev-teacher-login (see that test file for the failure
// modes that drive them): OTP verified server-side, metadata stamped on the
// verified user AFTER consumption, refreshed tokens persisted, same-origin
// redirect.
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
      user: { id: 'auth-parent-1' },
    },
    error: null,
  };
});
const refreshSession = vi.fn(async () => {
  calls.push('refreshSession');
  return {
    data: { session: { access_token: 'parent-jwt', refresh_token: 'parent-refresh' } },
    error: null,
  };
});
const setSession = vi.fn(async () => { calls.push('setSession'); return { data: {}, error: null }; });
const usersUpdate = vi.fn();

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
      builder.update = (value: unknown) => { usersUpdate(value); return builder; };
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

import { GET } from '@/app/api/auth/dev-parent-login/route';

const request = () => new NextRequest('http://localhost:3014/api/auth/dev-parent-login');

beforeEach(() => {
  calls = [];
  for (const mock of [updateUserById, generateLink, verifyOtp, refreshSession, setSession, usersUpdate]) mock.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/auth/dev-parent-login', () => {
  it('generates the link for the parent reviewer account', async () => {
    await GET(request());
    expect(generateLink).toHaveBeenCalledWith({
      type: 'magiclink',
      email: 'astroli.parent.reviewer@gmail.com',
    });
  });

  it('stamps parent metadata on the verified user AFTER consuming the OTP', async () => {
    await GET(request());
    expect(calls.indexOf('verifyOtp')).toBeLessThan(calls.indexOf('updateUserById'));
    expect(updateUserById).toHaveBeenCalledWith('auth-parent-1', {
      user_metadata: {
        role: 'parent',
        parent_id: 'ec6c4710-3b4b-4920-967a-b3e8424fbaa8',
        student_id: null,
        teacher_id: null,
      },
    });
  });

  it('persists the refreshed (parent) tokens and links the users row', async () => {
    await GET(request());
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'parent-jwt',
      refresh_token: 'parent-refresh',
    });
    expect(usersUpdate).toHaveBeenCalledWith({ auth_user_id: 'auth-parent-1' });
  });

  it('redirects to the parent dashboard on the same origin as the request', async () => {
    const response = await GET(request());
    expect(response.status).toBeGreaterThanOrEqual(302);
    expect(response.status).toBeLessThan(308);
    // No index page exists at /parent — the parent app's home is the dashboard.
    expect(response.headers.get('location')).toBe('http://localhost:3014/parent/dashboard');
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
