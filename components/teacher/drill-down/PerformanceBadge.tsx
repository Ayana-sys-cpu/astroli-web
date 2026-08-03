// src/astroli-web/components/teacher/drill-down/PerformanceBadge.tsx
'use client';
import { performanceLabel, performanceTooltip } from '@/lib/drill-down-types';
import type { PerformanceInfo } from '@/lib/drill-down-types';

interface Props {
  performance: PerformanceInfo | null;
  size?: 'sm' | 'md';
  variant?: 'filled' | 'outlined';
}

export default function PerformanceBadge({
  performance,
  size = 'md',
  variant = 'filled',
}: Props) {
  const label = performanceLabel(performance);
  // Every badge explains itself. Before this, the only tooltip in the drill-down
  // restated the level name and its ordinal — which tells nobody who doesn't
  // already know the scale anything at all.
  const tooltip = performanceTooltip(performance);

  // Three Perkins depth tiers over the real 1-7 scale: low (1-2) → light purple,
  // mid (3-5) → medium purple, high (6-7) → deep purple.
  const level = performance && !performance.isGraceCompletion ? performance.level : null;

  let color: string;
  let filledBg: string;
  if (!performance) {
    color = 'rgba(26,26,46,0.35)';
    filledBg = 'rgba(26,26,46,0.06)';
  } else if (performance.isGraceCompletion) {
    color = '#d97706';
    filledBg = 'rgba(217,119,6,0.12)';
  } else if (!level || level <= 2) {
    // Low tier: Explanation, Exemplification — light violet tint
    color = '#7c3aed';
    filledBg = 'rgba(124,58,237,0.09)';
  } else if (level <= 5) {
    // Mid tier: Comparison, Contextualization, Application — richer violet
    color = '#5b21b6';
    filledBg = 'rgba(91,33,182,0.18)';
  } else {
    // High tier: Justification, Generalization — filled dark indigo
    color = '#ffffff';
    filledBg = '#4c1d95';
  }

  const fontSize = size === 'sm' ? 10 : 11;
  const padding = size === 'sm' ? '2px 8px' : '3px 10px';

  return (
    <span
      title={tooltip}
      aria-label={`${label} — ${tooltip}`}
      style={{
        display: 'inline-block',
        background: variant === 'filled' ? filledBg : 'transparent',
        color,
        border: variant === 'outlined' ? `1px solid ${color}` : 'none',
        fontSize,
        fontWeight: 500,
        padding,
        borderRadius: 20,
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      {label}
    </span>
  );
}
