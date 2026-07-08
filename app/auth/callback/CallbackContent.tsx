'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

// Singleton browser client — reads/writes the Supabase session via cookies so
// server route handlers (getUser) can see it on the follow-up API calls.
let _client: ReturnType<typeof createBrowserClient> | null = null;
function getBrowserClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _client;
}

/**
 * Client-side auth callback.
 *
 * Supabase delivers the session two different ways depending on how the link
 * was generated:
 *
 *   1. Admin invite / server magic-link (inviteUserByEmail, server signInWithOtp)
 *      → IMPLICIT flow. Tokens arrive in the URL *fragment*:
 *        /auth/callback?invite=TOKEN#access_token=…&refresh_token=…
 *      Fragments are stripped by the browser before any request, so a server
 *      route can NEVER read them. This component reads them from
 *      window.location.hash and persists the session via setSession().
 *
 *   2. Browser-initiated PKCE (dev-login) → tokens arrive as ?code=…
 *      We exchange it in the browser, where the PKCE code_verifier lives.
 *
 * Once a session is persisted to cookies, invite links go straight to
 * /auth/accept-invite; everything else is finalised server-side.
 */
export default function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const ranRef = useRef(false);

  useEffect(() => {
    // Guard against React 18 StrictMode double-invoke consuming the code twice.
    if (ranRef.current) return;
    ranRef.current = true;

    async function run() {
      const supabase = getBrowserClient();

      // ── Parse the URL fragment (implicit flow tokens or an auth error) ──
      const hash = typeof window !== 'undefined'
        ? window.location.hash.replace(/^#/, '')
        : '';
      const hashParams = new URLSearchParams(hash);
      const accessToken  = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const hashError    = hashParams.get('error') || params.get('error');

      const invite = params.get('invite');
      const code   = params.get('code');

      // Supabase reports expired / already-used links via the fragment.
      if (hashError) {
        router.replace('/?error=invalid_link');
        return;
      }

      // Strip the fragment from the address bar so the tokens aren't left in
      // history / shared URLs once we've captured them.
      if (hash && typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname + window.location.search);
      }

      // ── Establish the session ──────────────────────────────────────────
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('[auth/callback] setSession failed:', error.message);
          router.replace('/?error=invalid_link');
          return;
        }
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
          router.replace('/?error=invalid_link');
          return;
        }
      } else {
        // Neither fragment tokens nor a PKCE code — nothing to sign in with.
        router.replace('/?error=invalid_link');
        return;
      }

      // ── Invite link → straight to acceptance (no DB round-trip here) ───
      if (invite) {
        router.replace(`/auth/accept-invite?token=${invite}`);
        return;
      }

      // ── Non-invite magic link (dev-login / teacher) → finalise server-side ──
      try {
        const res  = await fetch('/api/auth/finalize-login', { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          router.replace(`/?error=${data.error ?? 'invalid_link'}`);
          return;
        }
        router.replace(data.redirect ?? '/');
      } catch {
        router.replace('/?error=service_error');
      }
    }

    run();
  }, [router, params]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-black">
      <div className="max-w-md space-y-4">
        <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin mx-auto" />
        <p className="text-white/60 text-sm">Signing you in…</p>
      </div>
    </main>
  );
}
