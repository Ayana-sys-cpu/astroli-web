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
]);

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return supabaseResponse;
}

export const config = {
  // Run middleware on all API routes and teacher pages.
  // Next.js built-ins (_next/static, _next/image, favicon.ico) are excluded automatically.
  matcher: ['/api/:path*', '/teacher', '/teacher/:path*'],
};
