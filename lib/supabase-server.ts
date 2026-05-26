/**
 * Server-only Supabase clients.
 *
 * This file must NEVER be imported by client components or hooks — it
 * initialises supabaseAdmin with the service-role key (which is undefined in
 * the browser) and imports `next/headers` (unavailable in client bundles).
 *
 * Import only from API routes and Server Components.
 * For browser Realtime / read queries, use getBrowserClient() from lib/supabase.ts.
 */
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './supabase';

// ── Admin client (service-role key — bypasses RLS) ────────────────────────────
// Initialised once per serverless instance. Never expose this to the browser.
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  },
);

/**
 * SSR-aware Supabase client for use inside API route handlers.
 * Reads and writes the auth session via Next.js cookies().
 * Call this once per request — do NOT cache the return value across requests.
 */
export function createSSRServerClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where cookies are read-only.
            // Safe to ignore — middleware handles cookie refresh.
          }
        },
      },
    },
  );
}
