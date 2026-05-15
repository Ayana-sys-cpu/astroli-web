'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import StarField from '@/components/StarField';
import TopBar from '@/components/TopBar';
import AvatarHero from '@/components/AvatarHero';
import SlotMachine from '@/components/SlotMachine';
import { useAvatar } from '@/hooks/useAvatar';
import { getFirstName } from '@/lib/student-store';
import { MOCK_USER } from '@/lib/mock-data';

export default function MissionWelcomePage() {
  const router = useRouter();
  const [slotDone, setSlotDone] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [trophyHint, setTrophyHint] = useState(false);
  const avatar = useAvatar();
  const firstName = getFirstName() || MOCK_USER.firstName;

  const handleSlotComplete = () => {
    setSlotDone(true);
    setTimeout(() => setShowContinue(true), 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      className="relative min-h-screen bg-black overflow-hidden flex flex-col"
    >
      <StarField count={90} seed={7} />

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none bg-grid" />

      {/* Radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600,
          height: 600,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(255,0,128,0.05) 0%, rgba(0,245,212,0.04) 50%, transparent 70%)',
        }}
      />

      <TopBar />

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-7 pt-14">

        {/* Hero avatar */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', damping: 16, stiffness: 130 }}
          onClick={() => setTrophyHint(true)}
        >
          <AvatarHero
            level={7}
            trophies={42}
            xpProgress={0.72}
            size={160}
            avatarUrl={avatar.loading ? undefined : avatar.url}
            onTrophyClick={() => setTrophyHint((v) => !v)}
          />
        </motion.div>

        {/* Trophy hint tooltip */}
        {trophyHint && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute mt-2 px-3 py-1.5 rounded-lg text-xs font-space tracking-wide text-white/60"
            style={{
              background: '#0a0a1a',
              border: '1px solid rgba(255,214,0,0.25)',
              top: 'calc(50% - 60px)',
              boxShadow: '0 0 12px rgba(255,214,0,0.15)',
            }}
          >
            🏆 Trophy Room — coming soon
          </motion.div>
        )}

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.6 }}
          className="flex flex-col items-center gap-1"
        >
          <p className="text-[10px] tracking-[0.3em] text-white/28 font-space uppercase">
            WELCOME BACK, TRAVELER
          </p>
          <h1
            className="font-caveat font-bold text-center leading-none"
            style={{
              fontSize: 'clamp(56px, 7vw, 80px)',
              color: '#fff',
              textShadow: '0 0 40px rgba(255,255,255,0.12)',
            }}
          >
            Hi, {firstName}.
          </h1>
        </motion.div>

        {/* Slot machine — fires ~1s after greeting */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          <SlotMachine
            finalRole="INVESTIGATOR"
            onComplete={handleSlotComplete}
            delay={1100}
          />
        </motion.div>

        {/* XP hint */}
        {slotDone && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-xs font-inter text-white/28 tracking-wide"
          >
            Level 7 · 72% to Level 8
          </motion.p>
        )}
      </div>

      {/* Continue button */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={showContinue ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.5, type: 'spring', damping: 18 }}
        className="absolute bottom-8 right-8"
      >
        <button
          onClick={() => router.push('/mission/reveal')}
          className="flex items-center gap-2 px-5 py-3 rounded-full font-space text-xs tracking-[0.18em] font-bold uppercase transition-all"
          style={{
            background: 'rgba(255,0,128,0.08)',
            border: '1px solid rgba(255,0,128,0.4)',
            color: '#FF0080',
            boxShadow: '0 0 18px rgba(255,0,128,0.2)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 28px rgba(255,0,128,0.4)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 18px rgba(255,0,128,0.2)';
          }}
        >
          <span>SEE YOUR MISSION</span>
          <span>→</span>
        </button>
      </motion.div>
    </motion.div>
  );
}
