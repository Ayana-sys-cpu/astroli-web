'use client';
import { useState } from 'react';
import type { SignalType } from '@/lib/signals';

// ── SVG icons (14×14px, inside 28px badge) ───────────────────────────────────

const BreakthroughIcon = () => (
  // Lightning bolt — a spark of insight
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M9 1L3 9h5l-1 6 6-8H8l1-6z" fill="#a16207" stroke="#a16207" strokeWidth="0.5" strokeLinejoin="round" />
  </svg>
);

const GraceIcon = () => (
  // Life ring — a student who needs a rescue conversation
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6" stroke="#b91c1c" strokeWidth="1.5" />
    <circle cx="8" cy="8" r="2.5" stroke="#b91c1c" strokeWidth="1.5" />
    <line x1="8" y1="2" x2="8" y2="5.5" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="8" y1="10.5" x2="8" y2="14" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="2" y1="8" x2="5.5" y2="8" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="10.5" y1="8" x2="14" y2="8" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const StuckIcon = () => (
  // Question mark in orbit — circling without landing
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6.5" stroke="#1d4ed8" strokeWidth="1.5" />
    <path d="M6.2 6.2c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8c0 .9-.7 1.4-1.4 1.8C7.7 8.4 7.5 9 7.5 9.5" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="7.5" cy="11.2" r="0.8" fill="#1d4ed8" />
  </svg>
);

const NonEngagementIcon = () => (
  // Crescent moon — student has gone quiet
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M12 10.5A6 6 0 0 1 5.5 4a6 6 0 0 0 6.5 6.5z" fill="#c2410c" stroke="#c2410c" strokeWidth="0.8" strokeLinejoin="round" />
  </svg>
);

// ── Config ────────────────────────────────────────────────────────────────────

const SIGNAL_CONFIG: Record<SignalType, { icon: React.ReactNode; tooltip: string; bg: string }> = {
  breakthrough:    { icon: <BreakthroughIcon />, tooltip: 'Breakthrough',         bg: 'rgba(254,240,138,0.95)' },
  grace_completion:{ icon: <GraceIcon />,        tooltip: 'Grace completion',     bg: 'rgba(254,202,202,0.95)' },
  stuck:           { icon: <StuckIcon />,        tooltip: 'Stuck / not connecting', bg: 'rgba(191,219,254,0.95)' },
  non_engagement:  { icon: <NonEngagementIcon />,tooltip: 'Non-engagement',       bg: 'rgba(254,215,170,0.95)' },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface SignalBadgeProps {
  signalType: SignalType | null;
}

export default function SignalBadge({ signalType }: SignalBadgeProps) {
  const [visible, setVisible] = useState(false);

  if (!signalType) return null;

  const cfg = SIGNAL_CONFIG[signalType];

  return (
    {/* Parent card must have position: relative for absolute positioning to work */}
    <div
      role="img"
      aria-label={cfg.tooltip}
      tabIndex={0}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: cfg.bg,
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
        zIndex: 2,
        outline: 'none',
      }}
    >
      {cfg.icon}
      {visible && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: '#1a1a2e',
            color: '#fff',
            fontSize: 11,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            padding: '4px 8px',
            borderRadius: 5,
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          {cfg.tooltip}
        </div>
      )}
    </div>
  );
}
