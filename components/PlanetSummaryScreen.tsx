'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t, type Lang } from '@/lib/i18n';
import { type SummaryInsight } from '@/hooks/usePlanetVoice';

const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL ?? 'https://astorli-bot.vercel.app';

const T = {
  bg:   'rgba(0,0,0,0.96)',
  orin: '#06D6A0',
  card: 'rgba(255,255,255,0.04)',
  bdr:  'rgba(255,255,255,0.08)',
  tp:   '#e2e8f0',
  ts:   '#8896a8',
  ac:   '#00d4d4',
} as const;

interface EditableInsight extends SummaryInsight {
  studentAddition: string;
  editing: boolean;
  draftText: string;
}

interface CoinAward {
  awarded:    boolean;
  amount:     number;
  newBalance: number;
  eventType:  string;
}

interface Props {
  studentId:        string;
  planetId:         string;
  insights:         SummaryInsight[];
  completionType:   'standard' | 'grace';
  onLocked:         (reward?: CoinAward | null) => void;
  onDismiss:        () => void;
  language?:        Lang;
  mode?:            'lock' | 'review';
  introducedTerms?: string[];
}

export default function PlanetSummaryScreen({
  studentId, planetId, insights, completionType, onLocked, onDismiss, language = 'en', mode = 'lock',
  introducedTerms = [],
}: Props) {
  const [cards, setCards] = useState<EditableInsight[]>(
    insights.map(i => ({ ...i, studentAddition: '', editing: false, draftText: i.insightText })),
  );
  const [additionalText, setAdditionalText] = useState('');
  const [addingNew, setAddingNew]           = useState(false);
  const [locking, setLocking]               = useState(false);
  const [lockError, setLockError]           = useState(false);

  const startEdit   = (idx: number) =>
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, editing: true, draftText: c.insightText } : c));
  const confirmEdit = (idx: number) =>
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, editing: false, studentAddition: c.draftText !== c.insightText ? c.draftText : '' } : c));
  const cancelEdit  = (idx: number) =>
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, editing: false } : c));
  const setDraft    = (idx: number, text: string) =>
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, draftText: text } : c));

  const displayText = (c: EditableInsight) => c.studentAddition || c.insightText;

  const handleLockIn = async () => {
    setLocking(true);
    setLockError(false);
    try {
      const res = await fetch(`${BOT_URL}/api/planet-voice/complete`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          planetId,
          completionType,
          confirmedInsights: cards.map(c => ({
            goalSlug:        c.goalSlug,
            termName:        c.termName,
            insightText:     displayText(c),
            evidence:        c.evidence,
            studentAddition: c.studentAddition || undefined,
          })),
          additionalInsight: additionalText.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('save failed');
      const data = await res.json().catch(() => null);
      onLocked(data?.reward ?? null);
    } catch {
      setLockError(true);
      setLocking(false);
    }
  };

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
        {cards.map((card, idx) => (
          <motion.div
            key={card.goalSlug}
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
            {card.editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea
                  autoFocus
                  value={card.draftText}
                  onChange={e => setDraft(idx, e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${T.ac}`,
                    borderRadius: 8,
                    color: T.tp,
                    fontSize: 13,
                    lineHeight: 1.65,
                    padding: '10px 12px',
                    resize: 'none',
                    minHeight: 72,
                    width: '100%',
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => cancelEdit(idx)}
                    style={{ fontSize: 12, color: T.ts, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                  >
                    ✗ cancel
                  </button>
                  <button
                    onClick={() => confirmEdit(idx)}
                    style={{
                      fontSize: 12, color: '#000', background: T.ac,
                      border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 12px', fontWeight: 700,
                    }}
                  >
                    ✓ save
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  {card.termName && (
                    <p style={{ fontSize: 13, fontWeight: 700, color: T.ac, margin: '0 0 4px 0' }}>
                      {card.termName}
                    </p>
                  )}
                  <p style={{ fontSize: 13, color: T.tp, lineHeight: 1.65, margin: 0 }}>
                    {displayText(card)}
                  </p>
                </div>
                <button
                  onClick={() => startEdit(idx)}
                  title="Edit this insight"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: T.ts, fontSize: 14, flexShrink: 0,
                    opacity: 0.5, transition: 'opacity 0.15s',
                    padding: '2px 4px',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.5'; }}
                >
                  ✏
                </button>
              </div>
            )}
          </motion.div>
        ))}

        {/* Add something I missed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 + cards.length * 0.15, duration: 0.3 }}
        >
          <AnimatePresence mode="wait">
            {addingNew ? (
              <motion.div
                key="adding"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  background: T.card, border: `1px solid ${T.ac}`,
                  borderRadius: 12, padding: '14px 16px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}
              >
                <textarea
                  autoFocus
                  value={additionalText}
                  onChange={e => setAdditionalText(e.target.value)}
                  placeholder="What else did you discover?"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid rgba(255,255,255,0.12)`,
                    borderRadius: 8,
                    color: T.tp, fontSize: 13, lineHeight: 1.65,
                    padding: '10px 12px', resize: 'none', minHeight: 64,
                    width: '100%', outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setAddingNew(false); setAdditionalText(''); }}
                    style={{ fontSize: 12, color: T.ts, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                  >
                    ✗ cancel
                  </button>
                  <button
                    onClick={() => setAddingNew(false)}
                    style={{
                      fontSize: 12, color: '#000', background: T.ac,
                      border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 12px', fontWeight: 700,
                    }}
                  >
                    ✓ add
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="add-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAddingNew(true)}
                style={{
                  width: '100%', textAlign: 'left',
                  background: 'none', border: `1px dashed rgba(255,255,255,0.12)`,
                  borderRadius: 12, padding: '12px 16px',
                  color: T.ts, fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                whileHover={{ borderColor: 'rgba(255,255,255,0.25)' }}
              >
                <span style={{ fontSize: 16 }}>+</span>
                {t('addSomethingMissed', language)}
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Introduced terms */}
      {introducedTerms.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + cards.length * 0.15, duration: 0.3 }}
          style={{ padding: '16px 20px 0' }}
        >
          <p style={{
            fontSize: 10, fontWeight: 700, color: T.ts,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            margin: '0 0 10px 0',
          }}>
            {t('termsEncountered', language)}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {introducedTerms.map(term => (
              <span key={term} style={{
                fontSize: 12, color: T.ac,
                background: 'rgba(0,212,212,0.08)',
                border: `1px solid rgba(0,212,212,0.2)`,
                borderRadius: 20, padding: '4px 12px',
              }}>
                {term}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Bottom actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 + cards.length * 0.15, duration: 0.3 }}
        style={{ padding: '24px 20px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {lockError && (
          <p style={{ fontSize: 11, color: '#ff6b6b', textAlign: 'center', margin: 0 }}>
            Couldn&apos;t save — tap &ldquo;Lock it in&rdquo; to try again.
          </p>
        )}

        {mode === 'review' ? (
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
        ) : (
          <>
            <button
              onClick={handleLockIn}
              disabled={locking}
              style={{
                width: '100%', padding: '15px 20px', borderRadius: 14,
                background: locking ? 'rgba(0,212,212,0.3)' : T.ac,
                border: 'none', cursor: locking ? 'default' : 'pointer',
                color: '#000', fontSize: 15, fontWeight: 800,
                transition: 'background 0.2s',
              }}
            >
              {locking ? t('savingLabel', language) : t('lockItIn', language)}
            </button>

            <button
              onClick={onDismiss}
              disabled={locking}
              style={{
                width: '100%', padding: '11px 20px', borderRadius: 14,
                background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer', color: T.ts, fontSize: 13,
              }}
            >
              {t('keepExploring', language)}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
