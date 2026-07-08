'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { saveStudent, saveAlienName, saveBaseAvatarUrl, markOnboardingComplete, clearSession } from '@/lib/student-store';

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

// Root-domain indicator cookie so astroli.ai can detect an active session
// without reading the Supabase auth token (scoped to app.astroli.ai).
function setSessionIndicator() {
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  const domainAttr = domain ? `; domain=${domain}` : '';
  document.cookie = `astroli_session=1; path=/${domainAttr}; max-age=1209600; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
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
 * For invite links we complete acceptance RIGHT HERE using the access token we
 * already hold from the fragment (passed as a Bearer token). We deliberately do
 * NOT hop to /auth/accept-invite and re-read the session with getSession(): on
 * production that second read could hang on the auth Web Lock after setSession,
 * leaving the student stuck on a spinner. Doing the work here — with the token
 * in hand — removes that failure mode entirely.
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
      let bearer = accessToken ?? undefined;
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
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
          router.replace('/?error=invalid_link');
          return;
        }
        bearer = data.session?.access_token;
      } else {
        // Neither fragment tokens nor a PKCE code — nothing to sign in with.
        router.replace('/?error=invalid_link');
        return;
      }

      // ── Invite link → accept it here with the token in hand ────────────
      if (invite) {
        try {
          const res = await fetch('/api/auth/accept-invite', {
            method:  'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
            },
            body: JSON.stringify({ token: invite }),
          });

          // Already accepted — the account exists; continue as a returning student.
          if (res.status === 409) {
            markOnboardingComplete();
            router.replace('/syncing');
            return;
          }

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            console.error('[auth/callback] accept-invite failed:', res.status, data);
            router.replace('/?error=invalid_link');
            return;
          }

          setSessionIndicator();
          if (data.isNewStudent) clearSession();
          saveStudent({
            firstName:     data.firstName,
            baseAvatarUrl: data.baseAvatarUrl ?? null,
            avatarUrl:     null,
          });
          if (data.alienName)     saveAlienName(data.alienName);
          if (data.baseAvatarUrl) saveBaseAvatarUrl(data.baseAvatarUrl);
          if (!data.isNewStudent) markOnboardingComplete();

          router.replace(data.isNewStudent ? '/onboarding/reveal' : '/syncing');
        } catch {
          router.replace('/?error=service_error');
        }
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
