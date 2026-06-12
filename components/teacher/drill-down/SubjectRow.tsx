// src/astroli-web/components/teacher/drill-down/SubjectRow.tsx
'use client';
import PerformanceBadge from './PerformanceBadge';
import type { SubjectSummary } from '@/lib/drill-down-types';

interface Props {
  subject: SubjectSummary;
  isSelected: boolean;
  onOpenProof: () => void;
}

export default function SubjectRow({ subject, isSelected, onOpenProof }: Props) {
  const canOpenProof = subject.status !== 'not_started';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 20px',
        background: isSelected ? 'rgba(124,58,237,0.08)' : 'transparent',
        borderBottom: '1px solid rgba(232,232,240,0.06)',
        gap: 12,
        transition: 'background 0.15s',
      }}
    >
      {/* Title + journey tag */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'rgba(232,232,240,0.9)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {subject.planetTitle}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(232,232,240,0.35)', marginTop: 2 }}>
          {subject.journeyTitle}
        </div>
      </div>

      {/* Performance badge */}
      <PerformanceBadge performanceType={subject.performanceType} />

      {/* Proof button — circular chevron */}
      <button
        onClick={canOpenProof ? onOpenProof : undefined}
        disabled={!canOpenProof}
        aria-label={canOpenProof ? `View proof for ${subject.planetTitle}` : undefined}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: `1px solid ${canOpenProof ? 'rgba(232,232,240,0.2)' : 'rgba(232,232,240,0.07)'}`,
          background: 'transparent',
          color: canOpenProof ? 'rgba(232,232,240,0.7)' : 'rgba(232,232,240,0.2)',
          cursor: canOpenProof ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          flexShrink: 0,
          transition: 'border-color 0.15s, color 0.15s',
        }}
      >
        ›
      </button>
    </div>
  );
}
