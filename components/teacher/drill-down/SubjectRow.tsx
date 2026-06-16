'use client';
import { useState } from 'react';
import PerformanceBadge from './PerformanceBadge';
import GoalCard from './GoalCard';
import type { SubjectSummary } from '@/lib/drill-down-types';

const PERKINS_RANK_OUT_OF_10: Record<string, number> = {
  grace_completion: 1,
  explaining: 2,
  mustering_evidence: 3,
  finding_examples: 4,
  generalizing: 5,
  applying_concepts: 6,
  analogizing: 7,
  representing_in_new_ways: 8,
  considering_alternatives: 9,
  actionable_extrapolation: 10,
};

const PERKINS_LABEL: Record<string, string> = {
  grace_completion: 'Grace Completion',
  explaining: 'Explaining',
  mustering_evidence: 'Mustering Evidence',
  finding_examples: 'Finding Examples',
  generalizing: 'Generalizing',
  applying_concepts: 'Applying Concepts',
  analogizing: 'Analogizing',
  representing_in_new_ways: 'Representing in New Ways',
  considering_alternatives: 'Considering Alternatives',
  actionable_extrapolation: 'Actionable Extrapolation',
};

function DotProgress({ performanceType }: { performanceType: string | null }) {
  const filled = performanceType ? (PERKINS_RANK_OUT_OF_10[performanceType] ?? 0) : 0;
  const name = performanceType ? (PERKINS_LABEL[performanceType] ?? performanceType) : null;
  const tooltip = name
    ? `${name} — level ${filled} of 10 on the Perkins Thinking Scale`
    : 'Not yet assessed';
  return (
    <div
      style={{ display: 'flex', gap: 2, alignItems: 'center' }}
      title={tooltip}
      aria-label={tooltip}
      role="img"
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i < filled ? 6 : 5,
            height: i < filled ? 6 : 5,
            borderRadius: '50%',
            background: i < filled ? '#8B00FF' : 'rgba(139,0,255,0.15)',
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  );
}

interface Props {
  subject: SubjectSummary;
  mode: 'this-week' | 'all-time';
  studentInitials: string;
  /** Controlled accordion — when provided, local state is ignored */
  isExpanded?: boolean;
  onToggle?: () => void;
}

export default function SubjectRow({ subject, mode, studentInitials, isExpanded, onToggle }: Props) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const controlled = isExpanded !== undefined && onToggle !== undefined;
  const expanded = controlled ? isExpanded : localExpanded;
  const toggle = controlled ? onToggle : () => setLocalExpanded((v) => !v);

  const canExpand = subject.status !== 'not_started' && subject.status !== 'pending_activation';

  return (
    <div style={{ borderBottom: '1px solid rgba(26,26,46,0.06)' }}>
      <div
        onClick={() => canExpand && toggle()}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 20px',
          gap: 14,
          cursor: canExpand ? 'pointer' : 'default',
          background: expanded ? 'rgba(139,0,255,0.03)' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: canExpand ? '#1a1a2e' : 'rgba(26,26,46,0.4)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {subject.planetTitle}
          </div>
          {subject.teachingGoalCount > 0 && (
            <div style={{ fontSize: 11, color: 'rgba(26,26,46,0.4)', marginTop: 2 }}>
              {subject.teachingGoalCount} {subject.teachingGoalCount === 1 ? 'goal' : 'goals'}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <DotProgress performanceType={subject.performanceType} />
          <PerformanceBadge performanceType={subject.performanceType} size="sm" />
        </div>

        {canExpand && (
          <div style={{
            fontSize: 12,
            color: 'rgba(139,0,255,0.5)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}>
            ▾
          </div>
        )}
      </div>

      {expanded && canExpand && (
        <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {subject.goals.length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(26,26,46,0.35)', margin: 0 }}>
              No goal details recorded yet.
            </p>
          ) : mode === 'this-week' ? (
            subject.goals.map((goal, i) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                goalIndex={i}
                studentInitials={studentInitials}
              />
            ))
          ) : (
            subject.goals.map((goal, i) => (
              <div
                key={goal.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(26,26,46,0.06)',
                  borderRadius: 8,
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flex: 1 }}>
                  <span style={{ fontSize: 10, color: 'rgba(26,26,46,0.35)', flexShrink: 0 }}>
                    Goal {i + 1}
                  </span>
                  <span style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 500 }}>
                    {goal.goalTitle}
                  </span>
                </div>
                <PerformanceBadge performanceType={goal.performanceType} size="sm" />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
