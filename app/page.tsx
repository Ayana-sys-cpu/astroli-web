'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Script from 'next/script';
import StarField from '@/components/StarField';
import { saveStudent, markOnboardingComplete, saveBaseAvatarUrl, clearSession } from '@/lib/student-store';
import { saveTeacher, saveCourses } from '@/lib/teacher-store';
import { createBrowserClient } from '@supabase/ssr';
import type { Session } from '@supabase/supabase-js';

const LINES: [number, number, number, number][] = [
  [8, 18, 28, 40], [28, 40, 50, 22], [50, 22, 72, 38],
  [72, 38, 88, 62], [28, 40, 38, 68], [38, 68, 60, 78],
  [14, 62, 38, 68], [72, 38, 82, 20], [50, 22, 62, 8],
];
const DOTS: [number, number][] = [
  [8, 18], [28, 40], [50, 22], [72, 38], [88, 62],
  [38, 68], [60, 78], [14, 62], [82, 20], [62, 8],
];

// Singleton SSR-aware browser client — stores the Supabase session in cookies
// so the Next.js middleware can read it on subsequent API requests.
let _ssrClient: ReturnType<typeof createBrowserClient> | null = null;
function getSupabaseBrowserClient() {
  if (!_ssrClient) {
    _ssrClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _ssrClient;
}

// Sets a lightweight root-domain cookie so astroli.ai can detect an active session
// without needing access to the Supabase auth token (which stays scoped to app.astroli.ai).
function setSessionIndicator() {
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  const domainAttr = domain ? `; domain=${domain}` : '';
  document.cookie = `astroli_session=1; path=/${domainAttr}; max-age=1209600; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
}

function clearSessionIndicator() {
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  const domainAttr = domain ? `; domain=${domain}` : '';
  document.cookie = `astroli_session=; path=/${domainAttr}; max-age=0`;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [gisReady, setGisReady] = useState(false);
  const [linesReady, setLinesReady] = useState(false);
  // true while we check for an existing session (avoids flash of login form)
  const [checkingSession, setCheckingSession] = useState(true);

  // If the user already has a valid session, skip the login form entirely.
  useEffect(() => {
    let cancelled = false;
    getSupabaseBrowserClient().auth.getSession().then(async (result: { data: { session: Session | null } }) => {
      if (cancelled) return;
      const session = result.data.session;
      if (session) {
        const role = session.user.user_metadata?.role;
        if (role === 'teacher') router.replace('/teacher');
        else if (role === 'parent') {
          // Always send parents to the dashboard — the server-side layout checks
          // real DB state and redirects to /parent/onboarding when needed.
          router.replace('/parent/dashboard');
        }
        else if (role === 'student') router.replace('/syncing');
        else {
          await getSupabaseBrowserClient().auth.signOut();
          setCheckingSession(false);
        }
      } else {
        setCheckingSession(false);
      }
    }).catch(() => {
      if (!cancelled) setCheckingSession(false);
    });
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    const t = setTimeout(() => setLinesReady(true), 400);
    return () => clearTimeout(t);
  }, []);

  // Surface friendly errors that arrive via redirect from /auth/callback (query
  // string) OR directly from Supabase's /verify on a bad link (URL fragment).
  // When a magic/invite link is expired, already used, or superseded by a newer
  // send, Supabase redirects to the Site URL with #error=access_denied&
  // error_code=otp_expired&error_description=... — a fragment the server never
  // sees, so we must read it here on the client.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash  = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const code     = query.get('error');
    const hashErr  = hash.get('error') || hash.get('error_code');

    if (hashErr) {
      // otp_expired / access_denied — the emailed link is no longer valid. The
      // most common real cause is clicking an older invite email after a newer
      // one was sent (each resend invalidates the previous link).
      setError('That invite link has expired or was already used. Ask your parent to resend, then open the most recent email and click it once.');
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (!code) return;
    if (code === 'invalid_link')       setError('That sign-in link is invalid or has expired. Ask your parent to send a fresh invite.');
    else if (code === 'service_error') setError('Service temporarily unavailable. Please try again.');
    else if (code === 'not_registered') setError("This email isn't linked to an Astroli account. Sign up via your parent's invite.");
    // Clean the param from the URL so a refresh doesn't re-display the error
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  // Handle GIS script already cached — onLoad won't fire in that case
  useEffect(() => {
    if ((window as any).google?.accounts?.oauth2) {
      setGisReady(true);
      return;
    }
    let attempts = 0;
    const interval = setInterval(() => {
      if ((window as any).google?.accounts?.oauth2) {
        setGisReady(true);
        clearInterval(interval);
      } else if (++attempts > 100) {
        clearInterval(interval);
        setError('Google sign-in failed to load. Disable your ad blocker and refresh.');
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Authorization code flow — the code is exchanged server-side for an access
  // token so it never touches the browser. One round-trip replaces the old
  // identify + student-status + registration chain.
  // Shared routing logic — called by both the code flow and the token-flow fallback.
  const applyAuthResponse = async (data: any) => {
    if (data.authToken) {
      const { error: otpError } = await getSupabaseBrowserClient().auth.verifyOtp({
        token_hash: data.authToken,
        type: 'email',
      });
      if (otpError) {
        console.error('[login] verifyOtp failed:', otpError.message);
        throw new Error(`Session setup failed: ${otpError.message}`);
      }
    }

    setSessionIndicator();

    if (data.role === 'teacher') {
      saveTeacher({ name: data.name });
      saveCourses(data.courses ?? []);
      router.push('/teacher');
      return;
    }

    if (data.role === 'parent') {
      if (!data.hasChild) {
        router.push('/parent/onboarding');
      } else if (!data.hasJourney) {
        router.push('/parent/onboarding?step=journey');
      } else {
        router.push('/parent/dashboard');
      }
      return;
    }

    if (data.role === 'waitlisted') {
      router.push('/auth/waitlist');
      return;
    }

    if (data.role === 'invited') {
      setLoading(false);
      if (data.emailSent) {
        setInfoMsg("We've sent a sign-in link to your email. Click it to join Astroli!");
      } else {
        // OTP send failed — fall back to direct redirect (student will need session from email link)
        router.push(`/auth/accept-invite?token=${data.inviteToken}`);
      }
      return;
    }

    // ── Student path ────────────────────────────────────────────────────────
    // If the server treats this as a new student, wipe any stale localStorage
    // (e.g. onboarding_complete flag from a deleted account or a previous user
    // on the same device) before writing fresh values. This ensures the
    // interest page never bypasses onboarding based on outdated local state.
    if (data.isNewStudent) clearSession();

    saveStudent({ firstName: data.firstName, baseAvatarUrl: data.baseAvatarUrl ?? null, avatarUrl: data.avatarUrl ?? null });
    if (data.baseAvatarUrl) saveBaseAvatarUrl(data.baseAvatarUrl);
    if (!data.isNewStudent) markOnboardingComplete();

    router.push(data.isNewStudent ? '/onboarding/reveal' : '/syncing');
  };

  // Token-flow fallback — used when GOOGLE_CLIENT_SECRET is absent (local dev).
  const handleGoogleToken = async (accessToken: string) => {
    try {
      const res = await fetch('/api/auth/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.role === 'waitlisted') { router.push('/auth/waitlist'); return; }
        throw new Error(`Auth failed (${res.status}): ${err.error ?? 'unknown'}`);
      }
      await applyAuthResponse(await res.json());
    } catch (err) {
      console.error('[login]', err);
      setError("Couldn't sign you in. Check your connection and try again.");
      setLoading(false);
    }
  };

  const triggerTokenFlow = () => {
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      scope: 'email profile https://www.googleapis.com/auth/classroom.courses.readonly',
      callback: (resp: any) => {
        if (resp.error || !resp.access_token) {
          setError("Couldn't sign you in. Please try again.");
          setLoading(false);
          return;
        }
        handleGoogleToken(resp.access_token);
      },
    });
    client.requestAccessToken();
  };

  const handleGoogleCode = async (code: string) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      // GOOGLE_CLIENT_SECRET not configured on this server — fall back to the
      // token flow (identify route). This happens in local dev; production always
      // has the secret set.
      if (res.status === 503) {
        triggerTokenFlow();
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.role === 'waitlisted') { router.push('/auth/waitlist'); return; }
        throw new Error(`Auth failed (${res.status}): ${err.error ?? 'unknown'}`);
      }

      await applyAuthResponse(await res.json());
    } catch (err) {
      console.error('[login]', err);
      setError("Couldn't sign you in. Check your connection and try again.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!gisReady || loading) return;
    setLoading(true);
    setError(null);
    // Authorization code flow — Google returns a one-time code, not a token.
    // The code is exchanged server-side in /api/auth/google using GOOGLE_CLIENT_SECRET.
    // Falls back to token flow (triggerTokenFlow) when the secret is absent (local dev).
    const client = (window as any).google.accounts.oauth2.initCodeClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      scope: 'email profile https://www.googleapis.com/auth/classroom.courses.readonly',
      ux_mode: 'popup',
      callback: (resp: any) => {
        if (resp.error || !resp.code) {
          setError("Couldn't sign you in. Please try again.");
          setLoading(false);
          return;
        }
        handleGoogleCode(resp.code);
      },
    });
    client.requestCode();
  };

  // Note: we intentionally do NOT blank the page while checking the session.
  // The branded backdrop + wordmark render immediately; only the sign-in button
  // is held disabled until the check resolves (see `checkingSession` on the
  // button below), so an already-signed-in user is redirected without ever
  // seeing a usable login form.
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden"
    >
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGisReady(true)}
      />

      <StarField count={130} />

      {/* Radial ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 800, height: 500,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse, rgba(255,0,128,0.07) 0%, rgba(139,0,255,0.04) 45%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />

      {/* Animated constellation */}
      <svg className="constellation-svg absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
        {linesReady && LINES.map(([x1, y1, x2, y2], i) => (
          <motion.line
            key={i}
            x1={`${x1}%`} y1={`${y1}%`}
            x2={`${x2}%`} y2={`${y2}%`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: i * 0.11, duration: 0.65, ease: 'easeOut' }}
          />
        ))}
        {DOTS.map(([cx, cy], i) => (
          <motion.circle
            key={i}
            cx={`${cx}%`} cy={`${cy}%`} r="2.2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
          />
        ))}
      </svg>

      {/* ── Main card ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center w-full max-w-sm px-8"
      >
        {/* Wordmark glow halo */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 360, height: 140,
            top: 0, left: '50%',
            transform: 'translateX(-50%)',
            background: 'radial-gradient(ellipse, rgba(255,0,128,0.22) 0%, rgba(0,245,212,0.1) 55%, transparent 75%)',
            filter: 'blur(20px)',
          }}
        />

        {/* ASTROLI wordmark */}
        <motion.h1
          initial={{ opacity: 0, letterSpacing: '0.6em' }}
          animate={{ opacity: 1, letterSpacing: '0.16em' }}
          transition={{ delay: 0.45, duration: 1, ease: 'easeOut' }}
          className="gradient-wordmark font-space font-black select-none relative z-10"
          style={{ fontSize: 'clamp(68px, 10vw, 100px)', lineHeight: 1 }}
        >
          ASTROLI
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95, duration: 0.6 }}
          className="text-[10px] tracking-[0.4em] text-white/30 font-space uppercase mt-3 mb-9"
        >
          ENTER THE MISSION
        </motion.p>

        {/* Separator */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.05, duration: 0.7, ease: 'easeOut' }}
          className="w-full h-px mb-8"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,0,128,0.5), rgba(0,245,212,0.5), transparent)' }}
        />

        {/* Google SSO button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 0.5 }}
          className="w-full flex flex-col gap-3"
        >
          <motion.button
            onClick={handleGoogleLogin}
            disabled={loading || !gisReady || checkingSession}
            whileHover={!loading ? { scale: 1.02 } : undefined}
            whileTap={!loading ? { scale: 0.97 } : undefined}
            className="relative overflow-hidden rounded-lg font-space font-bold tracking-[0.14em] text-sm w-full flex items-center justify-center gap-3"
            style={{
              height: 52,
              background: (loading || checkingSession)
                ? 'rgba(255,0,128,0.25)'
                : 'linear-gradient(120deg, #FF0080 0%, #a020f0 50%, #00F5D4 100%)',
              color: '#fff',
              border: 'none',
              cursor: (loading || !gisReady || checkingSession) ? 'default' : 'pointer',
              boxShadow: (loading || checkingSession) ? 'none' : '0 0 30px rgba(255,0,128,0.35), 0 0 60px rgba(0,245,212,0.12)',
              transition: 'box-shadow 0.3s',
            }}
          >
            {/* Shimmer */}
            <motion.span
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)',
                backgroundSize: '250% 100%',
              }}
              animate={{ backgroundPosition: ['250% 0', '-250% 0'] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
            />
            <span className="relative z-10 flex items-center gap-3">
              {loading || checkingSession ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {checkingSession && !loading ? 'CHECKING SESSION...' : 'CONNECTING...'}
                </>
              ) : (
                <>
                  {/* Google G icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                    <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="rgba(255,255,255,0.85)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="rgba(255,255,255,0.7)" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="rgba(255,255,255,0.9)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  CONTINUE WITH GOOGLE →
                </>
              )}
            </span>
          </motion.button>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-center font-inter"
              style={{ color: '#FF6B6B' }}
            >
              {error}
            </motion.p>
          )}
          {infoMsg && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-center font-inter"
              style={{ color: '#00F5D4' }}
            >
              {infoMsg}
            </motion.p>
          )}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.45 }}
          className="mt-5 text-[10px] text-white/18 font-inter text-center"
        >
          Sign in with your Google Classroom account
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
