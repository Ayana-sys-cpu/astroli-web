'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import { getFirstName, markOnboardingComplete, saveBaseAvatarUrl, saveAlienName, getAlienName, getBaseAvatarUrl, isOnboardingComplete } from '@/lib/student-store';

export default function RevealPage() {
  const router = useRouter();
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [showName, setShowName] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [saving, setSaving]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const firstName = getFirstName();
  const alienName  = getAlienName() ?? 'Orin';
  const storedBase = getBaseAvatarUrl();
  const baseUrl    = storedBase ?? '/avatars/base/base-03.png';
  const videoUrl   = baseUrl.replace('.png', '.mp4');

  // Returning users (already onboarded) should never see this screen
  useEffect(() => {
    if (isOnboardingComplete()) router.replace('/landscape');
  }, [router]);

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

  const handleBegin = async () => {
    if (saving) return; // double-tap on slow Wi-Fi would re-fire the PATCH
    setSaving(true);
    saveBaseAvatarUrl(baseUrl);
    saveAlienName(alienName);
    markOnboardingComplete();

    // Persist alien name and avatar URL to Supabase BEFORE navigating.
    // Must be awaited — Vercel serverless kills in-flight fetch calls the
    // moment the client navigates away and the function is no longer running.
    // student_id is read from the verified session on the server — not sent here.
    try {
      const res = await fetch('/api/student', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alien_name: alienName, base_avatar_url: baseUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[reveal] PATCH /api/student failed', res.status, err);
      }
    } catch (err) {
      console.error('[reveal] PATCH /api/student threw', err);
    }

    router.push('/syncing');
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

      {/* Avatar — floats freely, no clip. No z-index here: it would create a
          stacking context and break the video's screen-blend with the page. */}
      <div className="relative flex items-center justify-center" style={{ width: 320, height: 320, marginTop: 8 }}>
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

        {/* Avatar — MP4 on a black backdrop. `screen` blending drops the black
            frame into the page background so no rectangle edge shows. */}
        <AnimatePresence>
          {displayUrl && (
            <motion.video
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="absolute"
              style={{ width: 300, height: 300, objectFit: 'contain', mixBlendMode: 'screen' }}
              initial={{ scale: 0.7, opacity: 0, filter: 'blur(16px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
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
              disabled={saving}
              whileHover={saving ? undefined : { scale: 1.02 }}
              whileTap={saving ? undefined : { scale: 0.97 }}
              className="w-full max-w-md rounded-full font-space font-bold text-white relative overflow-hidden"
              style={{
                height: 56,
                background: 'linear-gradient(120deg, #FF0080 0%, #a020f0 50%, #00F5D4 100%)',
                boxShadow: '0 0 30px rgba(255,0,128,0.4)',
                border: 'none',
                letterSpacing: '0.18em',
                fontSize: 14,
                opacity: saving ? 0.7 : 1,
                cursor: saving ? 'default' : 'pointer',
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
              <span className="relative z-10 flex items-center justify-center gap-2">
                {saving && (
                  <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                {saving ? 'LAUNCHING…' : 'BEGIN YOUR JOURNEY ✦'}
              </span>
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
