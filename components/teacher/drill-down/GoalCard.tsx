'use client';
import PerformanceBadge from './PerformanceBadge';
import type { GoalSummary } from '@/lib/drill-down-types';

interface Props {
  goal: GoalSummary;
}

export default function GoalCard({ goal }: Props) {
  return (
    <div
      style={{
        background: 'rgba(232,232,240,0.04)',
        border: '1px solid rgba(232,232,240,0.08)',
        borderRadius: 8,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Goal title + badge row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(232,232,240,0.9)', lineHeight: 1.4 }}>
          {goal.goalTitle}
        </span>
        <PerformanceBadge performanceType={goal.performanceType} size="sm" />
      </div>

      {/* Key exchange */}
      <div
        style={{
          background: 'rgba(232,232,240,0.04)',
          borderRadius: 6,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(232,232,240,0.35)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Bot asked
          </div>
          <p style={{ fontSize: 12, color: 'rgba(232,232,240,0.55)', margin: 0, lineHeight: 1.5 }}>
            {goal.botQuestion}
          </p>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(232,232,240,0.35)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Student answered
          </div>
          <p style={{ fontSize: 12, color: 'rgba(232,232,240,0.85)', margin: 0, lineHeight: 1.5 }}>
            {goal.studentAnswer}
          </p>
        </div>
      </div>
    </div>
  );
}
