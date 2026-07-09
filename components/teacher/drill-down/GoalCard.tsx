'use client';
import PerformanceBadge from './PerformanceBadge';
import KineticText from '@/components/KineticText';
import type { GoalSummary } from '@/lib/drill-down-types';

const BotAvatar = () => (
  <div style={{
    width: 32, height: 32, borderRadius: '50%',
    background: 'rgba(139,0,255,0.08)',
    border: '1px solid rgba(139,0,255,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="8" width="16" height="12" rx="3" stroke="#8B00FF" strokeWidth="1.5"/>
      <circle cx="9" cy="14" r="1.5" fill="#8B00FF"/>
      <circle cx="15" cy="14" r="1.5" fill="#8B00FF"/>
      <path d="M12 4v4M9 4h6" stroke="#8B00FF" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  </div>
);

interface Props {
  goal: GoalSummary;
  goalIndex: number;
  studentInitials: string;
}

export default function GoalCard({ goal, goalIndex, studentInitials }: Props) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(26,26,46,0.07)',
        borderRadius: 12,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: '0 1px 4px rgba(26,26,46,0.06)',
      }}
    >
      {/* Header: Goal N · title · badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(26,26,46,0.35)', flexShrink: 0 }}>
            Goal {goalIndex + 1}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.4 }}>
            {goal.displayTitle}
          </span>
        </div>
        <PerformanceBadge performance={goal.performance} size="sm" variant="outlined" />
      </div>

      {/* Insight: what the bot noticed */}
      {goal.insightText && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <BotAvatar />
          <div style={{
            background: 'rgba(139,0,255,0.04)',
            border: '1px solid rgba(139,0,255,0.1)',
            borderRadius: '0 12px 12px 12px',
            padding: '10px 14px',
            flex: 1,
          }}>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(26,26,46,0.6)', fontStyle: 'italic', lineHeight: 1.55 }}>
              {goal.insightText}
            </p>
          </div>
        </div>
      )}

      {/* Evidence: what the student actually said */}
      {goal.conversationEvidence && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexDirection: 'row-reverse' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(26,26,46,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'rgba(26,26,46,0.5)',
            flexShrink: 0,
          }}>
            {studentInitials}
          </div>
          <div style={{
            background: '#fff',
            border: '1px solid rgba(26,26,46,0.1)',
            borderRadius: '12px 0 12px 12px',
            padding: '10px 14px',
            flex: 1,
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#1a1a2e', lineHeight: 1.55 }}>
              <KineticText text={goal.conversationEvidence} />
            </p>
          </div>
        </div>
      )}

      {/* Student's own addition, if they edited this during "Lock In" */}
      {goal.studentAddition && (
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(26,26,46,0.5)', fontStyle: 'italic', lineHeight: 1.5 }}>
          Student added: “{goal.studentAddition}”
        </p>
      )}
    </div>
  );
}
