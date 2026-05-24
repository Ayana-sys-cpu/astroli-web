'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import StarField from '@/components/StarField';
import TopBar from '@/components/TopBar';
import { useAvatar } from '@/hooks/useAvatar';
import { getStudentId, getInterest, loadStudent } from '@/lib/student-store';

// ── Animation variants ──────────────────────────────────────────────────────

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.16, delayChildren: 0.55 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', damping: 22, stiffness: 145 },
  },
};

// ── Alien identity helpers (mirrors onboarding/reveal logic) ────────────────

function pickBaseIndex(studentId: string): number {
  const sum = Array.from(studentId.replace(/-/g, '')).reduce(
    (a, c) => a + c.charCodeAt(0), 0
  );
  return (sum % 10) + 1;
}

function generateAlienName(interest: string): string {
  const prefixes = ['Xylo', 'Kael', 'Zyr', 'Vor', 'Nexo', 'Ael', 'Crix', 'Thal', 'Grix', 'Oru'];
  const suffixes = ['-Vex', '-9', '-Flux', '-Prime', '-Zyx', '-Kael', '-Omni', '-Sol', '-Nix', '-Ren'];
  const seed = Array.from(interest).reduce((a, c) => a + c.charCodeAt(0), 0);
  return prefixes[seed % prefixes.length] + suffixes[(seed * 7) % suffixes.length];
}

// ── Message ─────────────────────────────────────────────────────────────────

const ORIN_MSG =
  "The stars haven't aligned for your mission yet, Traveller. Your teacher is still preparing your next Celestial Journey.";

// ── Component ───────────────────────────────────────────────────────────────

export default function PendingJourneyPage() {
  const router = useRouter();
  const avatar = useAvatar();

  const [alienName,     setAlienName]     = useState('');
  const [baseAvatarUrl, setBaseAvatarUrl] = useState<string | null>(null);
  const [charIndex,     setCharIndex]     = useState(0);
  const [typingLive,    setTypingLive]    = useState(false);

  // Resolve alien identity from localStorage on mount
  useEffect(() => {
    const studentId = getStudentId() ?? '';
    const interest  = getInterest();
    setAlienName(interest ? generateAlienName(interest) : 'Xylo-Vex');

    const record = loadStudent();
    if (record?.baseAvatarUrl) {
      setBaseAvatarUrl(record.baseAvatarUrl);
    } else if (studentId) {
      const idx = pickBaseIndex(studentId);
      setBaseAvatarUrl(`/avatars/base/base-${String(idx).padStart(2, '0')}.png`);
    }
  }, []);

  // Start typewriter after entrance settles
  useEffect(() => {
    const t = setTimeout(() => setTypingLive(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Advance one character at a time
  useEffect(() => {
    if (!typingLive || charIndex >= ORIN_MSG.length) return;
    const t = setTimeout(() => setCharIndex((i) => i + 1), 26);
    return () => clearTimeout(t);
  }, [typingLive, charIndex]);

  // Poll every 30 s — redirect the moment a journey or vote becomes active
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const studentId = typeof window !== 'undefined'
          ? window.localStorage.getItem('astroli_student_id')
          : null;
        const url = studentId
          ? `/api/student/journey?studentId=${studentId}`
          : '/api/student/journey';
        const res = await fetch(url);
        const { hasActiveJourney, hasActiveVote } = await res.json();
        if (hasActiveJourney) router.replace('/landscape');
        else if (hasActiveVote) router.replace('/vote');
      } catch { /* swallow — next tick will retry */ }
    }, 30_000);
    return () => clearInterval(id);
  }, [router]);

  // Best available avatar: personalised > base > null (shows placeholder)
  const avatarSrc = (!avatar.loading && avatar.url) ? avatar.url : baseAvatarUrl;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: '#000000' }}
    >
      <StarField count={130} seed={88} />

      {/* ── Nebula A — magenta drift ──────────────────────────────────── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          inset: '-25%',
          background:
            'radial-gradient(ellipse at center, rgba(255,0,128,0.10) 0%, rgba(160,32,240,0.05) 40%, transparent 65%)',
        }}
        animate={{ x: ['-6%', '6%', '-6%'], y: ['-4%', '4%', '-4%'], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Nebula B — teal drift (offset timing) ─────────────────────── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          inset: '-25%',
          background:
            'radial-gradient(ellipse at 65% 55%, rgba(0,245,212,0.08) 0%, rgba(0,100,120,0.04) 45%, transparent 68%)',
        }}
        animate={{ x: ['6%', '-6%', '6%'], y: ['4%', '-4%', '4%'], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Light-leak sweep — fires once on entry ─────────────────────── */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          width: '60%',
          background:
            'linear-gradient(108deg, transparent 18%, rgba(255,0,128,0.22) 40%, rgba(0,245,212,0.14) 58%, transparent 78%)',
        }}
        initial={{ x: '-110%' }}
        animate={{ x: '160%' }}
        transition={{ delay: 0.1, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
        <div className="scan-line" />
      </div>

      <TopBar left="" />

      {/* ── Main staggered content ─────────────────────────────────────── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex-1 flex flex-col items-center justify-center gap-7 pt-14 px-6"
      >
        {/* ── BIG HEADLINE ──────────────────────────────────────────────── */}
        <motion.div variants={item} className="text-center leading-[0.92] select-none">
          <div
            className="font-space font-black uppercase"
            style={{
              fontSize: 'clamp(54px, 7.5vw, 96px)',
              letterSpacing: '-0.025em',
              background: 'linear-gradient(130deg, #FF0080 0%, #c060ff 45%, #00F5D4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            THE STARS
          </div>
          <div
            className="font-space font-black uppercase"
            style={{
              fontSize: 'clamp(54px, 7.5vw, 96px)',
              letterSpacing: '-0.025em',
              color: '#ffffff',
              textShadow: '0 0 80px rgba(255,255,255,0.07)',
            }}
          >
            HAVEN&apos;T ALIGNED.
          </div>
        </motion.div>

        {/* ── Message panel with inline avatar ──────────────────────────── */}
        <motion.div
          variants={item}
          className="flex items-start gap-3.5 w-full max-w-md"
          style={{
            background: 'rgba(0,245,212,0.04)',
            border: '1px solid rgba(0,245,212,0.14)',
            borderRadius: 16,
            padding: '16px 20px',
          }}
        >
          {/* Small avatar portrait — breathing lofi pulse */}
          <motion.div
            className="flex-shrink-0"
            animate={{ scale: [1, 1.05, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1.5px solid rgba(0,245,212,0.35)',
                boxShadow: '0 0 14px rgba(0,245,212,0.3)',
                background: 'radial-gradient(circle at 40% 35%, #1d0033, #06000f 60%, #000308)',
                flexShrink: 0,
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={alienName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                /* Teal shimmer placeholder while avatar loads */
                <motion.div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #001a15, #003a44)',
                  }}
                  animate={{ opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
              )}
            </div>
          </motion.div>

          {/* Content column: alien name + message */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <p
              className="font-space font-bold text-xs tracking-[0.16em] uppercase"
              style={{ color: '#00F5D4' }}
            >
              {alienName}
            </p>
            <p
              className="font-inter text-sm leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.6)', minHeight: 64 }}
            >
              {ORIN_MSG.slice(0, charIndex)}
              {typingLive && charIndex < ORIN_MSG.length && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                  style={{ color: '#00F5D4', marginLeft: 1 }}
                >
                  |
                </motion.span>
              )}
            </p>
          </div>
        </motion.div>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <motion.div variants={item} className="w-full max-w-md">
          <motion.div
            className="w-full px-5 py-4 rounded-xl text-center"
            style={{
              background: 'rgba(255,0,128,0.05)',
              border: '1px solid rgba(255,0,128,0.28)',
            }}
            animate={{
              boxShadow: [
                '0 0 0px rgba(255,0,128,0)',
                '0 0 24px rgba(255,0,128,0.32)',
                '0 0 0px rgba(255,0,128,0)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <p
              className="text-[9px] tracking-[0.28em] font-space uppercase mb-1.5"
              style={{ color: 'rgba(255,0,128,0.55)' }}
            >
              NEXT STEP
            </p>
            <p className="font-space font-bold text-sm text-white">
              Contact your teacher to ignite your path.
            </p>
          </motion.div>
        </motion.div>

        {/* ── Lofi breathing status indicator ───────────────────────────── */}
        <motion.div variants={item} className="flex items-center gap-2.5 pb-6">
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#00F5D4', boxShadow: '0 0 8px rgba(0,245,212,0.9)' }}
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.75, 1.25, 0.75] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.p
            className="text-[9px] tracking-[0.34em] font-space uppercase"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            AWAITING CELESTIAL ALIGNMENT
          </motion.p>
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#00F5D4', boxShadow: '0 0 8px rgba(0,245,212,0.9)' }}
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.75, 1.25, 0.75] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
          />
        </motion.div>

      </motion.div>
    </motion.div>
  );
}
