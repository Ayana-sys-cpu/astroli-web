'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import { getStudentId, getFirstName, getInterest, markOnboardingComplete } from '@/lib/student-store';

function pickBaseIndex(studentId: string): number {
  const sum = Array.from(studentId.replace(/-/g, '')).reduce((a, c) => a + c.charCodeAt(0), 0);
  return (sum % 10) + 1;
}

function generateAlienName(interest: string): string {
  const prefixes = ['Xylo', 'Kael', 'Zyr', 'Vor', 'Nexo', 'Ael', 'Crix', 'Thal', 'Grix', 'Oru'];
  const suffixes = ['-Vex', '-9', '-Flux', '-Prime', '-Zyx', '-Kael', '-Omni', '-Sol', '-Nix', '-Ren'];
  const seed = Array.from(interest).reduce((a, c) => a + c.charCodeAt(0), 0);
  return prefixes[seed % prefixes.length] + suffixes[(seed * 7) % suffixes.length];
}

export default function RevealPage() {
  const router = useRouter();
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [showName, setShowName] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const studentId = getStudentId() ?? '';
  const firstName = getFirstName();
  const interest  = getInterest();
  const alienName = interest ? generateAlienName(interest) : 'Xylo-Vex';
  const baseIndex = studentId ? pickBaseIndex(studentId) : 1;
  const baseUrl   = `/avatars/base/base-${String(baseIndex).padStart(2, '0')}.png`;

  useEffect(() => {
    timerRef.current = setTimeout(() => setDisplayUrl(baseUrl), 2500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [baseUrl]);

  useEffect(() => {
    if (!displayUrl) return;
    const t1 = setTimeout(() => setShowName(true), 900);
    const t2 = setTimeout(() => setShowCTA(true), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [displayUrl]);

  const handleBegin = () => {
    markOnboardingComplete();
    router.push('/landscape');
  };

  const skipToReveal = () => {
    if (displayUrl) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayUrl(baseUrl);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen bg-black flex flex-col items-center overflow-hidden cursor-pointer"
      style={{ background: '#000' }}
      onClick={skipToReveal}
    >
      <StarField count={70} seed={99} />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(0,245,212,0.07) 0%, transparent 60%)',
        }}
      />

      {/* Step label */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 0.3 }}
        className="mt-10 text-[11px] tracking-[0.4em] font-space uppercase z-10"
        style={{ color: '#00F5D4' }}
      >
        STEP 2 OF 2
      </motion.p>

      {/* Avatar — floats freely, no clip */}
      <div className="relative flex items-center justify-center z-10" style={{ width: 320, height: 320, marginTop: 8 }}>
        {/* Expanding stardust rings */}
        <AnimatePresence>
          {!displayUrl && [0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border"
              style={{ width: 260, height: 260, borderColor: '#00F5D4' }}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{
                delay: i * 0.3,
                duration: 1.2,
                repeat: Infinity,
                repeatDelay: 0.6,
                ease: 'easeOut',
              }}
            />
          ))}
        </AnimatePresence>

        {/* Avatar image — free-floating, no border/clip */}
        <AnimatePresence>
          {displayUrl && (
            <motion.img
              src={displayUrl}
              alt="Your alien"
              initial={{ scale: 0.7, opacity: 0, filter: 'blur(16px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute"
              style={{ width: 300, height: 300, objectFit: 'contain' }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Text content */}
      <div className="flex flex-col items-center gap-4 px-10 z-10" style={{ maxWidth: 480 }}>

        {/* Alien intro — matches mobile exactly */}
        <AnimatePresence>
          {showName && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <p
                className="font-space font-bold leading-snug"
                style={{ fontSize: 'clamp(28px, 4vw, 36px)', color: '#fff' }}
              >
                <span style={{ color: '#FF0080' }}>Oura </span>
                {firstName}! I&apos;m
              </p>
              <p
                className="font-space font-black"
                style={{
                  fontSize: 'clamp(44px, 6vw, 64px)',
                  color: '#FF0080',
                  textShadow: '0 0 40px rgba(255,0,128,0.5)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                }}
              >
                {alienName}.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mentor messages */}
        <AnimatePresence>
          {showName && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center flex flex-col gap-3"
            >
              <p
                className="font-space font-semibold text-white leading-relaxed"
                style={{ fontSize: 'clamp(18px, 2.5vw, 22px)' }}
              >
                I&apos;m excited to start our mission together.
              </p>
              <p
                className="font-inter text-white/50 leading-relaxed"
                style={{ fontSize: 'clamp(15px, 2vw, 18px)' }}
              >
                Don&apos;t worry, I&apos;ll be here with you every step of the way.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Assembling status */}
        {!showCTA && displayUrl && (
          <motion.p
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-[10px] tracking-[0.3em] font-space uppercase"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            assembling your alien...
          </motion.p>
        )}
      </div>

      {/* BEGIN YOUR JOURNEY — pinned to bottom */}
      <div className="flex-1" />
      <AnimatePresence>
        {showCTA && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: 'spring', damping: 18 }}
            className="w-full px-8 pb-10 flex flex-col items-center gap-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              onClick={handleBegin}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full max-w-md rounded-full font-space font-bold text-white relative overflow-hidden"
              style={{
                height: 56,
                background: 'linear-gradient(120deg, #FF0080 0%, #a020f0 50%, #00F5D4 100%)',
                boxShadow: '0 0 30px rgba(255,0,128,0.4)',
                border: 'none',
                letterSpacing: '0.18em',
                fontSize: 14,
              }}
            >
              <motion.span
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)',
                  backgroundSize: '250% 100%',
                }}
                animate={{ backgroundPosition: ['250% 0', '-250% 0'] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
              />
              <span className="relative z-10">BEGIN YOUR JOURNEY ✦</span>
            </motion.button>

            <p className="text-[11px] tracking-[0.25em] font-space uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
              ASTROLI × {firstName.toUpperCase()}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
