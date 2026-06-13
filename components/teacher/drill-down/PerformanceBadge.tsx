// src/astroli-web/components/teacher/drill-down/PerformanceBadge.tsx
'use client';
import { performanceLabel } from '@/lib/drill-down-types';
import type { PerformanceType } from '@/lib/drill-down-types';

interface Props {
  performanceType: PerformanceType | null;
  size?: 'sm' | 'md';
  variant?: 'filled' | 'outlined';
}

export default function PerformanceBadge({
  performanceType,
  size = 'md',
  variant = 'filled',
}: Props) {
  const label = performanceLabel(performanceType);

  let color: string;
  if (!performanceType) {
    color = 'rgba(26,26,46,0.35)';
  } else if (performanceType === 'grace_completion') {
    color = '#d97706';
  } else {
    color = '#15803d';
  }

  const fontSize = size === 'sm' ? 10 : 11;
  const padding = size === 'sm' ? '2px 8px' : '3px 10px';

  const filledBg = !performanceType
    ? 'rgba(26,26,46,0.06)'
    : performanceType === 'grace_completion'
    ? 'rgba(217,119,6,0.12)'
    : 'rgba(21,128,61,0.1)';

  return (
    <span
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
