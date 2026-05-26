import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that do NOT require a session. Everything else under /api/* does.
const PUBLIC_API_ROUTES = new Set([
  '/api/auth/identify',
  '/api/auth/student-status',
  '/api/vote-counts',
  '/api/winner',
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only intercept API routes.
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
  // Run middleware on all API routes; Next.js built-ins are excluded automatically.
  matcher: ['/api/:path*'],
};
