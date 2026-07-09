'use client';
import { motion } from 'framer-motion';
import StarField from '@/components/StarField';
import { t, type Lang } from '@/lib/i18n';

interface MissionOverlayProps {
  question: string;
  order: number;
  onAccept: () => void;
  language?: Lang;
}

export default function MissionOverlay({ question, order, onAccept, language }: MissionOverlayProps) {
  const lang: Lang = language ?? 'en';
  if (!question) return null;
  const words = question.split(' ');
  const label = `${t('missionLabel', lang)} ${String(order).padStart(2, '0')} · ${t('missionActivated', lang)}`;
  const lastWordDelay = 0.4 + words.length * 0.15;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-8"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
    >
      <StarField count={80} seed={42} />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 60%, rgba(255,0,128,0.09) 0%, transparent 55%), radial-gradient(ellipse at 70% 40%, rgba(0,245,212,0.06) 0%, transparent 55%)',
        }}
      />

      {/* Mission badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative z-10 flex items-center gap-3"
      >
        <div className="h-px w-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,0,128,0.5))' }} />
        <span className="text-[9px] tracking-[0.4em] text-white/40 font-space uppercase">{label}</span>
        <div className="h-px w-10" style={{ background: 'linear-gradient(90deg, rgba(0,245,212,0.5), transparent)' }} />
      </motion.div>

      {/* Big idea — word-by-word cinematic reveal */}
      <h1
        className="relative z-10 font-space font-black text-center leading-tight"
        dir={lang === 'he' ? 'rtl' : 'ltr'}
        style={{ fontSize: 'clamp(44px, 6.5vw, 88px)', letterSpacing: '-0.02em', maxWidth: 800 }}
      >
        {words.map((word, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.4 + i * 0.15, duration: 0.6, ease: 'easeOut' }}
            className="inline-block"
            style={{
              marginInlineEnd: '0.2em',
              color: i % 4 === 1 ? '#FF0080' : i % 4 === 3 ? '#00F5D4' : '#ffffff',
              textShadow:
                i % 4 === 1
                  ? '0 0 40px rgba(255,0,128,0.55)'
                  : i % 4 === 3
                  ? '0 0 40px rgba(0,245,212,0.55)'
                  : '0 0 20px rgba(255,255,255,0.12)',
            }}
          >
            {word}
          </motion.span>
        ))}
      </h1>

      {/* Glow divider */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: lastWordDelay + 0.2, duration: 0.8 }}
        className="relative z-10 h-px w-56"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,0,128,0.5), rgba(0,245,212,0.5), transparent)' }}
      />

      {/* Accept button */}
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: lastWordDelay + 0.55, duration: 0.5, type: 'spring', damping: 18 }}
        onClick={onAccept}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="relative z-10 overflow-hidden rounded-full font-space font-bold text-white"
        style={{
          height: 54,
          padding: '0 44px',
          background: 'linear-gradient(120deg, #FF0080 0%, #a020f0 50%, #00F5D4 100%)',
          boxShadow: '0 0 36px rgba(255,0,128,0.4)',
          border: 'none',
          letterSpacing: '0.18em',
          fontSize: 13,
          cursor: 'pointer',
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
        <span className="relative z-10">{t('acceptMission', lang)}</span>
      </motion.button>
    </motion.div>
  );
}
