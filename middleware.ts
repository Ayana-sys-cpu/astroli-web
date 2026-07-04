import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that do NOT require a session. Everything else under /api/* does.
const PUBLIC_API_ROUTES = new Set([
  '/api/auth/google',    // login endpoint — must be reachable before a session exists
  '/api/auth/identify',
  '/api/auth/student-status',
  '/api/vote-counts',
  '/api/winner',
  '/api/test/routing-check', // shadow session runner — auth via Bearer service role key
  '/api/leads',          // marketing landing page trial signup — no session exists yet
]);

/**
 * Mobile clients can't hold a Supabase cookie session, so they authenticate by
 * sending their student id in the `x-student-id` header (set after sign-in via
 * the public /api/auth/* endpoints). We verify the id is a real student in the
 * DB before letting the request through — a forged or unknown id is rejected.
 * Uses a direct Supabase REST call so this stays Edge-safe (no next/headers).
 */
async function isValidStudentHeader(studentId: string | null): Promise<boolean> {
  if (!studentId || !/^[0-9a-f-]{36}$/i.test(studentId)) return false;
  const base = process.env.SUPABASE_REST_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return false;
  try {
    const res = await fetch(
      `${base}users?id=eq.${studentId}&role=eq.student&select=id`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return false;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
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
    // Mobile fallback: allow requests carrying a DB-validated x-student-id
    // through to the route handlers, which apply their own authorization.
    if (await isValidStudentHeader(req.headers.get('x-student-id'))) {
      return NextResponse.next({ request: req });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return supabaseResponse;
}

export const config = {
  // Run middleware on all API routes and teacher pages.
  // Next.js built-ins (_next/static, _next/image, favicon.ico) are excluded automatically.
  matcher: ['/api/:path*', '/teacher', '/teacher/:path*'],
};
