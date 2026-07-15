// @vitest-environment node
//
// Middleware runs in the Next.js server runtime, never in a browser. Under the
// jsdom environment the global `Headers` is jsdom's own class, while NextRequest
// builds `req.headers` from the undici `Headers` bundled inside Next — so Next's
// internal `instanceof Headers` guard in NextResponse.next({ request }) throws
// "request.headers must be an instance of Headers". Pinning this file to the
// node environment keeps both sides on the same Headers class.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { VERIFIED_USER_HEADER, decodeVerifiedUserHeader } from '@/lib/verified-user-header';

const SECRET = 'test-service-role-secret';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = SECRET;

// Session state returned by the mocked Supabase client — mutated per test.
let sessionUser: User | null = null;
// When non-empty, getUser() simulates a token refresh by pushing these
// through the middleware's cookies.setAll callback.
let refreshedCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];
const getUser = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, config: {
    cookies: { setAll(cookies: typeof refreshedCookies): void };
  }) => ({
    auth: {
      getUser: async () => {
        getUser();
        if (refreshedCookies.length > 0) config.cookies.setAll(refreshedCookies);
        return { data: { user: sessionUser } };
      },
    },
  }),
}));

import { middleware } from '@/middleware';

function apiRequest(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost:3001${path}`, { headers });
}

function teacherUser(): User {
  return {
    id: 'auth-user-1',
    aud: 'authenticated',
    email: 'teacher@example.com',
    created_at: '2026-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: { role: 'teacher', teacher_id: 'teacher-1' },
  } as User;
}

/** Reads the request header the middleware forwards to route handlers. */
function forwardedHeader(response: Response, name: string): string | null {
  return response.headers.get(`x-middleware-request-${name}`);
}

beforeEach(() => {
  sessionUser = null;
  refreshedCookies = [];
  getUser.mockReset();
});

describe('middleware — verified-user forwarding to route handlers', () => {
  it('forwards the verified user in a signed header on authenticated API requests', async () => {
    sessionUser = teacherUser();

    const response = await middleware(apiRequest('/api/teacher/homescreen'));

    const encoded = forwardedHeader(response, VERIFIED_USER_HEADER);
    expect(encoded).toBeTruthy();
    expect(await decodeVerifiedUserHeader(encoded, SECRET)).toEqual(teacherUser());
  });

  it('overwrites a client-supplied verified-user header instead of forwarding it', async () => {
    sessionUser = teacherUser();

    const response = await middleware(
      apiRequest('/api/teacher/homescreen', { [VERIFIED_USER_HEADER]: 'forged-value' }),
    );

    expect(forwardedHeader(response, VERIFIED_USER_HEADER)).not.toBe('forged-value');
  });

  it('still returns 401 with no forwarded header when unauthenticated', async () => {
    const response = await middleware(apiRequest('/api/teacher/homescreen'));

    expect(response.status).toBe(401);
    expect(forwardedHeader(response, VERIFIED_USER_HEADER)).toBeNull();
  });

  it('leaves public routes untouched — no auth check, no forwarded header', async () => {
    const response = await middleware(apiRequest('/api/vote-counts'));

    expect(response.status).toBe(200);
    expect(getUser).not.toHaveBeenCalled();
    expect(forwardedHeader(response, VERIFIED_USER_HEADER)).toBeNull();
  });

  it('keeps propagating refreshed session cookies to the browser and the forwarded request', async () => {
    sessionUser = teacherUser();
    refreshedCookies = [{ name: 'sb-access-token', value: 'refreshed', options: { path: '/' } }];

    const response = await middleware(apiRequest('/api/teacher/homescreen'));

    expect(response.cookies.get('sb-access-token')?.value).toBe('refreshed');
    expect(forwardedHeader(response, 'cookie')).toContain('sb-access-token=refreshed');
  });
});
