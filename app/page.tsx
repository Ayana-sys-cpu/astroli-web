'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Script from 'next/script';
import StarField from '@/components/StarField';
import { saveStudent, cacheAvatarUrl } from '@/lib/student-store';
import { saveTeacher, saveCourses } from '@/lib/teacher-store';

const LINES: [number, number, number, number][] = [
  [8, 18, 28, 40], [28, 40, 50, 22], [50, 22, 72, 38],
  [72, 38, 88, 62], [28, 40, 38, 68], [38, 68, 60, 78],
  [14, 62, 38, 68], [72, 38, 82, 20], [50, 22, 62, 8],
];
const DOTS: [number, number][] = [
  [8, 18], [28, 40], [50, 22], [72, 38], [88, 62],
  [38, 68], [60, 78], [14, 62], [82, 20], [62, 8],
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gisReady, setGisReady] = useState(false);
  const [linesReady, setLinesReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLinesReady(true), 400);
    return () => clearTimeout(t);
  }, []);

  const handleGoogleUser = async (accessToken: string) => {
    try {
      // Identify role via Google Classroom check (server-side)
      const identifyRes = await fetch('/api/auth/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });
      if (!identifyRes.ok) throw new Error('Identity check failed');
      const identity = await identifyRes.json();

      if (identity.role === 'teacher') {
        saveTeacher({
          teacherId: identity.userId,
          email:     identity.email,
          name:      identity.name,
          googleId:  identity.googleId,
        });
        saveCourses(identity.courses ?? []);
        router.push('/teacher');
        return;
      }

      // ── Student path ──────────────────────────────────────────────────────
      const g = { email: identity.email, name: identity.name, given_name: identity.name.split(' ')[0] };

      const studentRes = await fetch(`/api/student?email=${encodeURIComponent(g.email)}`);
      const record = studentRes.ok ? await studentRes.json() : null;

      // NOTE: Do not auto-create Journeys here. Journey creation requires explicit teacher
      // activation. See docs/architecture/DB_ARCHITECTURE.md section 4.2.
      if (record?.student_id) {
        saveStudent({
          studentId:     record.student_id,
          email:         record.email ?? g.email,
          firstName:     record.first_name ?? g.given_name,
          baseAvatarUrl: record.base_avatar_url ?? null,
        });
        if (record.avatar_url && !record.avatar_url.startsWith('avatars/')) {
          cacheAvatarUrl(record.avatar_url);
        }
        router.push('/syncing');
      } else {
        const regRes = await fetch('/api/student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: g.email, full_name: g.name, first_name: g.given_name }),
        });
        if (!regRes.ok) throw new Error('Registration failed');
        const reg = await regRes.json();
        saveStudent({
          studentId:     reg.student_id,
          email:         g.email,
          firstName:     g.given_name,
          baseAvatarUrl: null,
        });
        router.push('/onboarding/interest');
      }
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
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      scope: 'email profile https://www.googleapis.com/auth/classroom.courses.readonly',
      callback: (resp: any) => {
        if (resp.error || !resp.access_token) {
          setError("Couldn't sign you in. Please try again.");
          setLoading(false);
          return;
        }
        handleGoogleUser(resp.access_token);
      },
    });
    client.requestAccessToken();
  };

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
            disabled={loading || !gisReady}
            whileHover={!loading ? { scale: 1.02 } : undefined}
            whileTap={!loading ? { scale: 0.97 } : undefined}
            className="relative overflow-hidden rounded-lg font-space font-bold tracking-[0.14em] text-sm w-full flex items-center justify-center gap-3"
            style={{
              height: 52,
              background: loading
                ? 'rgba(255,0,128,0.25)'
                : 'linear-gradient(120deg, #FF0080 0%, #a020f0 50%, #00F5D4 100%)',
              color: '#fff',
              border: 'none',
              cursor: (loading || !gisReady) ? 'default' : 'pointer',
              boxShadow: loading ? 'none' : '0 0 30px rgba(255,0,128,0.35), 0 0 60px rgba(0,245,212,0.12)',
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
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  CONNECTING...
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
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.45 }}
          className="mt-6 text-[10px] text-white/18 font-inter text-center"
        >
          Sign in with your Google Classroom account
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
