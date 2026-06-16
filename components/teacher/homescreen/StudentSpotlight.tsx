'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpotlightCard from './SpotlightCard';
import type { SpotlightStudent } from '@/lib/homescreen';

const SIGNAL_LABELS: Record<string, string> = {
  breakthrough: '🌟 Breakthroughs',
  grace_completion: '🔴 Grace Completions',
  stuck: '🔄 Stuck',
  non_engagement: '⚠️ Needs Check-in',
};

interface Props {
  students: SpotlightStudent[];
  journeyId: string;
}

export default function StudentSpotlight({ students, journeyId }: Props) {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = students.filter(s => !dismissed.has(s.studentId + ':' + s.signalType));

  const current = visible[index] ?? null;

  function dismiss(studentId: string, signalType: string, status: 'done' | 'dismissed') {
    fetch('/api/teacher/signal-acknowledgements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, journeyId, signalType, status }),
    });
    setDismissed(prev => new Set(prev).add(studentId + ':' + signalType));
    setIndex(i => Math.min(i, visible.length - 2));
  }

  if (visible.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(26,26,46,0.3)', fontFamily: 'var(--font-space)', fontSize: 12, letterSpacing: '0.08em' }}>
        ALL STUDENTS ADDRESSED ✦
      </div>
    );
  }

  const groupSignal = current?.signalType ?? 'non_engagement';
  const groupLabel = SIGNAL_LABELS[groupSignal] ?? '';

  return (
    <div>
      {/* Group label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-space)', color: 'rgba(26,26,46,0.4)', letterSpacing: '0.1em' }}>
          {groupLabel} · {index + 1} of {visible.length}
        </span>
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.div key={current.studentId + current.signalType}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <SpotlightCard
              student={current}
              onDone={() => dismiss(current.studentId, current.signalType, 'done')}
              onDismiss={() => dismiss(current.studentId, current.signalType, 'dismissed')}
              onWhatsApp={() => {}}
              onFlag={() => {
                fetch('/api/teacher/flags', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ studentId: current.studentId, journeyId }),
                });
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation arrows + dot indicators */}
      {visible.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 }}>
          <button
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
            style={{ background: 'none', border: 'none', color: index === 0 ? 'rgba(26,26,46,0.15)' : 'rgba(26,26,46,0.5)', cursor: index === 0 ? 'default' : 'pointer', fontSize: 18 }}
          >
            ‹
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            {visible.map((_, i) => (
              <button key={i} onClick={() => setIndex(i)} style={{
                width: i === index ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === index ? '#8B00FF' : 'rgba(139,0,255,0.2)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                padding: 0,
              }} />
            ))}
          </div>
          <button
            onClick={() => setIndex(i => Math.min(visible.length - 1, i + 1))}
            disabled={index === visible.length - 1}
            style={{ background: 'none', border: 'none', color: index === visible.length - 1 ? 'rgba(26,26,46,0.15)' : 'rgba(26,26,46,0.5)', cursor: index === visible.length - 1 ? 'default' : 'pointer', fontSize: 18 }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
