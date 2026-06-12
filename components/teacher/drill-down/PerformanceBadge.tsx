// src/astroli-web/components/teacher/drill-down/PerformanceBadge.tsx
'use client';
import { performanceLabel } from '@/lib/drill-down-types';
import type { PerformanceType } from '@/lib/drill-down-types';

interface Props {
  performanceType: PerformanceType | null;
  size?: 'sm' | 'md';
}

export default function PerformanceBadge({ performanceType, size = 'md' }: Props) {
  const label = performanceLabel(performanceType);

  let bg: string;
  let color: string;

  if (!performanceType) {
    bg = 'rgba(232,232,240,0.12)';
    color = 'rgba(232,232,240,0.45)';
  } else if (performanceType === 'grace_completion') {
    bg = 'rgba(234,179,8,0.2)';
    color = '#eab308';
  } else {
    bg = 'rgba(34,197,94,0.2)';
    color = '#22c55e';
  }

  const fontSize = size === 'sm' ? 10 : 11;
  const padding = size === 'sm' ? '2px 6px' : '3px 8px';

  return (
    <span
      style={{
        display: 'inline-block',
        background: bg,
        color,
        fontSize,
        fontWeight: 500,
        padding,
        borderRadius: 4,
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      {label}
    </span>
  );
}
