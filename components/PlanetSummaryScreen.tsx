'use client';

import { motion } from 'framer-motion';
import { t, type Lang } from '@/lib/i18n';
import { type SummaryInsight } from '@/hooks/usePlanetVoice';
import type { MissionTerm } from '@/lib/orin-guide-types';
import { TermRow } from '@/components/TermRow';

const T = {
  bg:   'rgba(0,0,0,0.96)',
  orin: '#06D6A0',
  card: 'rgba(255,255,255,0.04)',
  bdr:  'rgba(255,255,255,0.08)',
  tp:   '#e2e8f0',
  ts:   '#8896a8',
  ac:   '#00d4d4',
} as const;

interface Props {
  insights:         SummaryInsight[];
  onDismiss:        () => void;
  language?:        Lang;
  introducedTerms?: MissionTerm[];
}

// Read-only "what I learned here" view — shown automatically once a planet
// is complete, and again any time it's revisited. There is no confirmation
// step and no editing here; the planet is already recorded complete the
// instant the last goal is reached (finalizePlanetCompletion, astorli-bot),
// this is purely a review surface.
export default function PlanetSummaryScreen({
  insights, onDismiss, language = 'en', introducedTerms = [],
}: Props) {
  const displayText = (i: SummaryInsight & { studentAddition?: string | null }) =>
    i.studentAddition || i.insightText;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: T.bg,
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Orin frames the moment */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        style={{ padding: '28px 20px 0', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'radial-gradient(circle at 35% 35%, #80ffcc, #00aa77 60%, #003322)',
          border: `1px solid rgba(6,214,160,0.5)`,
        }} />
        <p style={{ fontSize: 15, fontWeight: 700, color: T.orin, margin: 0, lineHeight: 1.4 }}>
          {t('hereWhatICaught', language)}
        </p>
      </motion.div>

      {/* Insight cards stagger in */}
      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {insights.map((insight, idx) => (
          <motion.div
            key={insight.goalSlug || idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + idx * 0.15, duration: 0.3, ease: 'easeOut' }}
            style={{
              background: T.card,
              border: `1px solid ${T.bdr}`,
              borderRadius: 12,
              padding: '14px 16px',
            }}
          >
            {insight.termName && (
              <p style={{ fontSize: 13, fontWeight: 700, color: T.ac, margin: '0 0 4px 0' }}>
                {insight.termName}
              </p>
            )}
            <p style={{ fontSize: 13, color: T.tp, lineHeight: 1.65, margin: 0 }}>
              {displayText(insight)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Introduced terms */}
      {introducedTerms.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + insights.length * 0.15, duration: 0.3 }}
          style={{ padding: '16px 20px 0' }}
        >
          <p style={{
            fontSize: 10, fontWeight: 700, color: T.ts,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            margin: '0 0 10px 0',
          }}>
            {t('termsEncountered', language)}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {introducedTerms.map((term, i) => <TermRow key={i} term={term} />)}
          </div>
        </motion.div>
      )}

      {/* Bottom action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 + insights.length * 0.15, duration: 0.3 }}
        style={{ padding: '24px 20px 32px' }}
      >
        <button
          onClick={onDismiss}
          style={{
            width: '100%', padding: '15px 20px', borderRadius: 14,
            background: T.ac, border: 'none', cursor: 'pointer',
            color: '#000', fontSize: 15, fontWeight: 800,
          }}
        >
          {t('closeReview', language)}
        </button>
      </motion.div>
    </motion.div>
  );
}
