import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyOtp = vi.fn();
const refreshSession = vi.fn();

vi.mock('@/lib/supabase-server', () => ({
  supabaseAnon: {
    auth: {
      verifyOtp: (...args: unknown[]) => verifyOtp(...args),
      refreshSession: (...args: unknown[]) => refreshSession(...args),
    },
  },
}));

import { POST as sessionPOST } from '@/app/api/auth/session/route';
import { POST as refreshPOST } from '@/app/api/auth/refresh/route';

const SESSION = {
  access_token: 'jwt-access',
  refresh_token: 'jwt-refresh',
  expires_at: 1_800_000_000,
};

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  verifyOtp.mockReset();
  refreshSession.mockReset();
});

describe('POST /api/auth/session', () => {
  it('exchanges a magic-link token hash for session tokens', async () => {
    verifyOtp.mockResolvedValue({ data: { session: SESSION }, error: null });
    const res = await sessionPOST(jsonRequest({ authToken: 'hashed-token' }) as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      accessToken: 'jwt-access',
      refreshToken: 'jwt-refresh',
      expiresAt: 1_800_000_000,
    });
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'magiclink', token_hash: 'hashed-token' });
  });

  it('returns 401 when the token hash is invalid or already used', async () => {
    verifyOtp.mockResolvedValue({ data: { session: null }, error: new Error('otp expired') });
    const res = await sessionPOST(jsonRequest({ authToken: 'stale' }) as never);
    expect(res.status).toBe(401);
  });

  it('returns 400 on a missing authToken', async () => {
    const res = await sessionPOST(jsonRequest({}) as never);
    expect(res.status).toBe(400);
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/refresh', () => {
  it('rotates a refresh token into new session tokens', async () => {
    refreshSession.mockResolvedValue({ data: { session: SESSION }, error: null });
    const res = await refreshPOST(jsonRequest({ refreshToken: 'old-refresh' }) as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      accessToken: 'jwt-access',
      refreshToken: 'jwt-refresh',
      expiresAt: 1_800_000_000,
    });
    expect(refreshSession).toHaveBeenCalledWith({ refresh_token: 'old-refresh' });
  });

  it('returns 401 when the refresh token is revoked or unknown', async () => {
    refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('invalid') });
    const res = await refreshPOST(jsonRequest({ refreshToken: 'revoked' }) as never);
    expect(res.status).toBe(401);
  });
});
