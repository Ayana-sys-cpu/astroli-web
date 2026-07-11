import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { VERIFIED_USER_HEADER, encodeVerifiedUserHeader } from './lib/verified-user-header';

// Routes that do NOT require a session. Everything else under /api/* does.
const PUBLIC_API_ROUTES = new Set([
  '/api/auth/google',    // login endpoint — must be reachable before a session exists
  '/api/auth/identify',
  '/api/auth/accept-invite',        // invite link completion — no session exists yet
  '/api/auth/create-invite-session', // Resend-based invite: generate Supabase action_link at click time
  '/api/auth/finalize-login',        // non-invite magic-link completion — enforces its own getUser
  '/api/auth/dev-teacher-login',     // dev-only: one-click teacher session (delete before prod)
  '/api/auth/dev-parent-login',      // dev-only: one-click parent session (delete before prod)
  '/api/auth/student-status',
  '/api/auth/session',   // mobile: exchange sign-in authToken for a session — no session exists yet
  '/api/auth/refresh',   // mobile: rotate refresh token — access token may already be expired
  '/api/vote-counts',
  '/api/winner',
  '/api/test/routing-check', // shadow session runner — auth via Bearer service role key
  '/api/leads',          // marketing landing page trial signup — no session exists yet
]);

/**
 * Mobile clients can't hold a Supabase cookie session, so they authenticate
 * with a Supabase access token in the `Authorization: Bearer` header (obtained
 * at sign-in via POST /api/auth/session). We verify the token against Supabase
 * Auth before letting the request through — a bare student id is never enough.
 * Route handlers then derive the student identity from the same token
 * (resolveStudentIdFromRequest), so a forged or mismatched id is rejected.
 * Uses a direct Auth REST call so this stays Edge-safe (no next/headers).
 */
async function isValidBearerToken(authorization: string | null): Promise<boolean> {
  if (!authorization?.toLowerCase().startsWith('bearer ')) return false;
  const token = authorization.slice('bearer '.length).trim();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !base || !anonKey) return false;
  try {
    const res = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const user = await res.json();
    return typeof user?.id === 'string';
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Teacher page guard ────────────────────────────────────────────────────
  // /teacher and all sub-routes require a valid Supabase session with a
  // teacher_id in user_metadata. No session or wrong role → redirect to /.
  // This runs server-side so curl / direct URL access is blocked before the
  // page is rendered (returns 307 redirect, not 200).
  if (pathname === '/teacher' || pathname.startsWith('/teacher/')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll() {},  // read-only in middleware redirect path
        },
      },
    );
    const { data: { user } } = await supabase.auth.getUser();
    const isTeacher = Boolean(
      user?.user_metadata?.teacher_id || user?.user_metadata?.role === 'teacher'
    );
    if (!user || !isTeacher) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/';
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  // Only intercept API routes beyond this point.
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow public routes through without a session check.
  if (PUBLIC_API_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Build a response object we can mutate with refreshed cookies.
  let supabaseResponse = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Propagate refreshed tokens back to both the request (for downstream
          // route handlers) and the response (for the browser).
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() verifies the JWT signature server-side — it does not trust
  // the cookie value blindly. An expired or tampered token returns null user.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Mobile fallback: allow requests carrying a verified Supabase access
    // token through to the route handlers, which apply their own authorization
    // against the same token's subject.
    if (await isValidBearerToken(req.headers.get('authorization'))) {
      return NextResponse.next({ request: req });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Forward the verified user to route handlers in a signed header so
  // requireAuth() can skip a second Supabase Auth round trip. A forged
  // client-supplied value can never verify (HMAC with the service-role key),
  // and this set() overwrites any inbound value on authenticated requests.
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    return supabaseResponse; // degrade gracefully: handlers re-verify themselves
  }
  // req.headers already carries any cookies refreshed during getUser() above.
  const forwardedHeaders = new Headers(req.headers);
  forwardedHeaders.set(VERIFIED_USER_HEADER, await encodeVerifiedUserHeader(user, secret));
  const response = NextResponse.next({ request: { headers: forwardedHeaders } });
  // Keep any refreshed session cookies flowing back to the browser.
  supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export const config = {
  // Run middleware on all API routes and teacher pages.
  // Next.js built-ins (_next/static, _next/image, favicon.ico) are excluded automatically.
  matcher: ['/api/:path*', '/teacher', '/teacher/:path*'],
};
