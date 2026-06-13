'use client';
import GoalCard from './GoalCard';
import type { SubjectSummary } from '@/lib/drill-down-types';

interface Props {
  subject: SubjectSummary;
  onClose: () => void;
  studentInitials: string;
}

export default function ProofPanel({ subject, onClose, studentInitials }: Props) {
  return (
    <div
      style={{
        width: '45%',
        minWidth: 320,
        borderLeft: '1px solid rgba(255,255,255,0.7)',
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>
            {subject.planetTitle}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(26,26,46,0.4)', marginTop: 2 }}>
            {subject.journeyTitle}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close proof panel"
          style={{
            background: 'rgba(26,26,46,0.06)',
            border: '1px solid rgba(26,26,46,0.1)',
            borderRadius: 6,
            color: 'rgba(26,26,46,0.45)',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: 12,
          }}
        >
          ✕
        </button>
      </div>

      {/* Goal cards */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {subject.goals.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(26,26,46,0.35)', margin: 0 }}>
            No learning goals recorded for this subject yet.
          </p>
        ) : (
          subject.goals.map((goal, index) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              goalIndex={index}
              studentInitials={studentInitials}
            />
          ))
        )}
      </div>
    </div>
  );
}
