'use client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import StarField from '@/components/StarField';
import TopBar from '@/components/TopBar';
import AvatarHero from '@/components/AvatarHero';
import { useAvatar } from '@/hooks/useAvatar';
import { MOCK_MISSION } from '@/lib/mock-data';

/* Split "Who Owns The Truth?" into words for kinetic reveal */
const WORDS = MOCK_MISSION.bigIdea.split(' ');

export default function RevealPage() {
  const router = useRouter();
  const avatar = useAvatar();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative min-h-screen bg-black overflow-hidden flex flex-col"
    >
      <StarField count={100} seed={22} />

      {/* Deep radial glow — magenta/teal split */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 60%, rgba(255,0,128,0.07) 0%, transparent 55%), radial-gradient(ellipse at 70% 40%, rgba(0,245,212,0.05) 0%, transparent 55%)',
        }}
      />

      <TopBar />

      {/* ── Center stage ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-10 pt-14 gap-6">

        {/* Mission badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <div
            className="h-px w-12"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,0,128,0.5))' }}
          />
          <span className="text-[9px] tracking-[0.4em] text-white/35 font-space uppercase">
            {MOCK_MISSION.label}
          </span>
          <div
            className="h-px w-12"
            style={{ background: 'linear-gradient(90deg, rgba(0,245,212,0.5), transparent)' }}
          />
        </motion.div>

        {/* Big Idea — cinematic word-by-word reveal */}
        <h1
          className="font-space font-black text-center leading-none"
          style={{
            fontSize: 'clamp(60px, 8.5vw, 108px)',
            letterSpacing: '-0.02em',
          }}
        >
          {WORDS.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.5 + i * 0.18, duration: 0.65, ease: 'easeOut' }}
              className="inline-block mr-[0.22em]"
              style={{
                /* Alternate word colours for kinetic energy */
                color: i === 1 ? '#FF0080' : i === 3 ? '#00F5D4' : '#ffffff',
                textShadow:
                  i === 1
                    ? '0 0 40px rgba(255,0,128,0.55)'
                    : i === 3
                    ? '0 0 40px rgba(0,245,212,0.55)'
                    : '0 0 20px rgba(255,255,255,0.15)',
              }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.7 }}
          className="text-sm text-white/35 font-inter text-center max-w-md tracking-wide"
        >
          {MOCK_MISSION.subtitle}
        </motion.p>

        {/* Horizontal glow line */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.8, ease: 'easeOut' }}
          className="h-px w-64"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,0,128,0.5), rgba(0,245,212,0.5), transparent)',
          }}
        />
      </div>

      {/* ── Miniature Orin avatar — bottom right ──────────────────── */}
      <motion.button
        initial={{ opacity: 0, scale: 0.5, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: 1.5, type: 'spring', damping: 14, stiffness: 130 }}
        onClick={() => router.push('/mission/brief')}
        className="absolute bottom-8 right-8 flex flex-col items-center gap-2 group"
        title="Open Mission Brief"
      >
        <AvatarHero
          level={7}
          trophies={42}
          size={72}
          xpProgress={0.72}
          animate={false}
          avatarUrl={avatar.loading ? undefined : avatar.url}
        />
        <motion.p
          animate={{ opacity: [0.4, 0.85, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-[8px] tracking-[0.2em] font-space text-white/40 uppercase"
        >
          TAP TO BRIEF
        </motion.p>
      </motion.button>
    </motion.div>
  );
}
