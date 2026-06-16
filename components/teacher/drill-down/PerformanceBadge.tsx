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

  // Three Perkins depth tiers: low (1-3) → light purple, mid (4-6) → medium purple, high (7-9) → deep purple
  const PERKINS_ORDER = [
    'explaining', 'mustering_evidence', 'finding_examples',
    'generalizing', 'applying_concepts', 'analogizing',
    'representing_in_new_ways', 'considering_alternatives', 'actionable_extrapolation',
  ];
  const perkinsIndex = performanceType && performanceType !== 'grace_completion'
    ? PERKINS_ORDER.indexOf(performanceType)
    : -1;

  let color: string;
  let filledBg: string;
  if (!performanceType) {
    color = 'rgba(26,26,46,0.35)';
    filledBg = 'rgba(26,26,46,0.06)';
  } else if (performanceType === 'grace_completion') {
    color = '#d97706';
    filledBg = 'rgba(217,119,6,0.12)';
  } else if (perkinsIndex <= 2) {
    // Low tier: explaining, mustering_evidence, finding_examples — light violet tint
    color = '#7c3aed';
    filledBg = 'rgba(124,58,237,0.09)';
  } else if (perkinsIndex <= 5) {
    // Mid tier: generalizing, applying_concepts, analogizing — richer violet
    color = '#5b21b6';
    filledBg = 'rgba(91,33,182,0.18)';
  } else {
    // High tier: representing_in_new_ways, considering_alternatives, actionable_extrapolation — filled dark indigo
    color = '#ffffff';
    filledBg = '#4c1d95';
  }

  const fontSize = size === 'sm' ? 10 : 11;
  const padding = size === 'sm' ? '2px 8px' : '3px 10px';

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
