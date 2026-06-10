'use client';
import { useReducedMotion, motion } from 'framer-motion';
import SignalBadge from './SignalBadge';
import type { StudentSummary } from '@/app/api/teacher/students/route';

// ── Avatar colour — deterministic from studentId ──────────────────────────────
const AVATAR_COLORS = [
  '#4b5563', '#db2777', '#c2410c', '#0f766e',
  '#7c3aed', '#4338ca', '#15803d', '#1d4ed8', '#be123c',
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Journey pill colour by title keyword ─────────────────────────────────────
function journeyPillStyle(title: string): React.CSSProperties {
  const lower = title.toLowerCase();
  if (lower.includes('rome') || lower.includes('english'))
    return { background: '#fef3c7', color: '#92400e' };
  if (lower.includes('silk') || lower.includes('history'))
    return { background: '#ede9fe', color: '#5b21b6' };
  if (lower.includes('solar') || lower.includes('science'))
    return { background: '#dcfce7', color: '#166534' };
  return { background: '#f3f4f6', color: '#374151' };
}

// ── Last-seen formatting ──────────────────────────────────────────────────────
function formatLastSeen(lastSeenAt: string | null, isActiveNow: boolean): string {
  if (isActiveNow) return 'Active now';
  if (!lastSeenAt) return 'Not started';
  const d = new Date(lastSeenAt);
  if (isNaN(d.getTime())) return 'Not started';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Last seen ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface StudentCardProps {
  student: StudentSummary;
  onClick: (studentId: string) => void;
}

export default function StudentCard({ student, onClick }: StudentCardProps) {
  const color = avatarColor(student.studentId);
  const statusText = formatLastSeen(student.lastSeenAt, student.isActiveNow);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={prefersReducedMotion ? {} : { y: -2 }}
      transition={{ duration: 0.15 }}
      role="button"
      tabIndex={0}
      onClick={() => onClick(student.studentId)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(student.studentId); }}
      style={{
        background: '#ffffff',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        height: 240,
        userSelect: 'none',
        outline: 'none',
      }}
    >
      {/* ── Avatar zone ── */}
      <div
        style={{
          flex: 1,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          fontSize: 30,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.92)',
          letterSpacing: 1,
        }}
      >
        {student.initials}
        <SignalBadge signalType={student.signalType} />
      </div>

      {/* ── Info zone ── */}
      <div style={{ padding: '10px 12px 12px', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>
          {student.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: student.isActiveNow ? '#22c55e' : '#d1d5db', flexShrink: 0 }} />
          {statusText}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {student.journeyEnrollments.map((je) => (
            <span
              key={je.journeyId}
              style={{ ...journeyPillStyle(je.title), fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {je.title}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
