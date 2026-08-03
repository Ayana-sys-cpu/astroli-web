'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import StarField from '@/components/StarField';
import { getFirstName, saveInterest, isOnboardingComplete } from '@/lib/student-store';
import { t, type Lang } from '@/lib/i18n';

const INTEREST_TAGS = [
  'Deep Sea', 'Basketball', 'Space', 'Music',
  'Gaming', 'Art', 'Dinosaurs', 'Robots', 'Cars', 'Anime',
];

export default function InterestPage() {
  const router = useRouter();
  const [interest, setInterest] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [firstName, setFirstName] = useState('');
  // Inherited from the parent at invite acceptance — a child is never asked.
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    // Returning users (already onboarded) should never see this screen
    if (isOnboardingComplete()) { router.replace('/landscape'); return; }
    // Safe to read localStorage on client only
    setFirstName(getFirstName());

    const ctrl = new AbortController();
    fetch('/api/me/language', { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.language === 'he' || d?.language === 'en') setLang(d.language); })
      .catch(() => { /* keep English rather than blocking the screen */ });
    return () => ctrl.abort();
  }, [router]);

  const rtl = lang === 'he';

  const handleSubmit = () => {
    const trimmed = interest.trim();
    if (!trimmed || submitted) return;
    setSubmitted(true);

    saveInterest(trimmed);
    router.push('/onboarding/reveal');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden px-8"
    >
      <StarField count={60} seed={42} />

      {/* Radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600, height: 600,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(0,245,212,0.06) 0%, rgba(255,0,128,0.04) 50%, transparent 70%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6"
      >
        {/* Step label */}
        <p className="text-[10px] tracking-[0.4em] font-space uppercase" style={{ color: '#00F5D4', opacity: 0.7 }}>
          {t('studentStep1of2', lang)}
        </p>

        {/* Heading */}
        <div className="text-center" dir={rtl ? 'rtl' : 'ltr'}>
          <h1 className="font-space font-bold text-white leading-snug" style={{ fontSize: 'clamp(22px, 3.5vw, 30px)' }}>
            {t('studentInterestHello', lang).replace('{name}', firstName)}{' '}
          </h1>
          <h1 className="font-space font-bold leading-snug" style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', color: '#FF0080' }}>
            {t('studentInterestQuestion', lang)}
          </h1>
        </div>

        <p className="text-xs text-white/40 font-inter text-center leading-relaxed" dir={rtl ? 'rtl' : 'ltr'}>
          {t('studentInterestHint', lang)}
        </p>

        {/* Text input */}
        <div className="w-full relative">
          <input
            className="input-dark font-space text-sm text-center w-full"
            style={{ letterSpacing: '0.04em' }}
            dir={rtl ? 'rtl' : 'ltr'}
            placeholder={t('studentInterestPlaceholder', lang)}
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
            disabled={submitted}
          />
          {/* Glow underline when focused */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,245,212,0.5), transparent)' }}
          />
        </div>

        {/* Quick-pick tags */}
        <div className="flex flex-wrap gap-2 justify-center">
          {INTEREST_TAGS.map((tag) => (
            <motion.button
              key={tag}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setInterest((prev) => prev === tag ? '' : tag)}
              className="px-3.5 py-1.5 rounded-full text-xs font-inter border transition-all"
              style={{
                borderColor: interest === tag ? 'rgba(0,245,212,0.5)' : 'rgba(255,255,255,0.1)',
                background: interest === tag ? 'rgba(0,245,212,0.08)' : 'rgba(255,255,255,0.03)',
                color: interest === tag ? '#00F5D4' : 'rgba(255,255,255,0.5)',
              }}
            >
              {tag}
            </motion.button>
          ))}
        </div>

        {/* CTA button */}
        <motion.button
          onClick={handleSubmit}
          disabled={!interest.trim() || submitted}
          whileHover={interest.trim() && !submitted ? { scale: 1.02 } : undefined}
          whileTap={interest.trim() && !submitted ? { scale: 0.97 } : undefined}
          className="w-full rounded-lg font-space font-bold tracking-[0.18em] text-sm relative overflow-hidden"
          style={{
            height: 52,
            background: (!interest.trim() || submitted)
              ? 'rgba(0,245,212,0.1)'
              : 'linear-gradient(120deg, #00F5D4 0%, #a020f0 50%, #FF0080 100%)',
            color: (!interest.trim() || submitted) ? 'rgba(0,245,212,0.4)' : '#fff',
            border: 'none',
            cursor: (!interest.trim() || submitted) ? 'default' : 'pointer',
            boxShadow: (!interest.trim() || submitted) ? 'none' : '0 0 24px rgba(0,245,212,0.3)',
            transition: 'all 0.3s',
          }}
        >
          {submitted ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ASSEMBLING YOUR ALIEN...
            </span>
          ) : (
            'ENTER THE CONSTELLATION ✦'
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
