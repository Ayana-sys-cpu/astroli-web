'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { createBrowserClient } from '@supabase/ssr';
import { saveStudent, saveAlienName, saveBaseAvatarUrl, markOnboardingComplete, clearSession } from '@/lib/student-store';
import StarField from '@/components/StarField';

const NODES: [number, number][] = [
  [50, 38], [27, 22], [73, 20], [80, 55],
  [20, 58], [50, 72], [14, 40], [86, 38],
  [35, 55], [65, 52],
];
const EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
  [1, 6], [2, 7], [0, 8], [0, 9],
];

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
      let inviteTokenFromMeta: string | undefined;
      if (accessToken && refreshToken) {
        const { data: sd, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('[auth/callback] setSession failed:', error.message);
          router.replace('/?error=invalid_link');
          return;
        }
        // The invite token may have been passed via user_metadata (set by
        // create-invite-session) when the redirectTo didn't carry ?invite=TOKEN.
        inviteTokenFromMeta = sd.session?.user.user_metadata?.inviteToken as string | undefined;
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
      // The token can arrive as a ?invite= query param or via the session's
      // user_metadata (set by create-invite-session when redirectTo couldn't
      // carry it). The metadata value is only available after the session is
      // established above, so resolve `invite` here rather than up front.
      const invite = params.get('invite') || inviteTokenFromMeta;
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden"
    >
      <StarField count={100} seed={17} />

      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <filter id="node-glow">
            <feGaussianBlur stdDeviation="1.2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {EDGES.map(([a, b], i) => (
          <motion.line
            key={i}
            x1={NODES[a][0]} y1={NODES[a][1]}
            x2={NODES[b][0]} y2={NODES[b][1]}
            stroke="rgba(0,245,212,0.22)"
            strokeWidth="0.3"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.18, duration: 0.7, ease: 'easeOut' }}
          />
        ))}
        {NODES.map(([cx, cy], i) => (
          <motion.circle
            key={i}
            cx={cx} cy={cy}
            r={i === 0 ? 2.2 : 1.1}
            fill={i === 0 ? 'rgba(0,245,212,0.9)' : 'rgba(0,245,212,0.45)'}
            filter="url(#node-glow)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.13, duration: 0.4, type: 'spring', damping: 14 }}
          />
        ))}
        <motion.circle
          cx={NODES[0][0]} cy={NODES[0][1]}
          r={4}
          fill="none"
          stroke="rgba(0,245,212,0.3)"
          strokeWidth="0.4"
          initial={{ scale: 0.5, opacity: 0.8 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ delay: 1.2, duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        />
      </svg>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="scan-line" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="font-caveat text-3xl text-white/80 tracking-wide"
        >
          Signing you in…
        </motion.p>
        <motion.div
          className="mt-2 h-px rounded-full overflow-hidden"
          style={{ width: 160, background: 'rgba(255,255,255,0.06)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #FF0080, #00F5D4)',
              boxShadow: '0 0 6px rgba(0,245,212,0.5)',
            }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.6, duration: 2.4, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
