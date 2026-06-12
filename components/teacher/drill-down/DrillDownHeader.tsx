// src/astroli-web/components/teacher/drill-down/DrillDownHeader.tsx
'use client';
import { useRouter } from 'next/navigation';
import type { DrillDownStudent } from '@/lib/drill-down-types';

// Same deterministic colour as StudentCard — copy kept local to avoid a shared util
const AVATAR_COLORS = [
  '#4b5563', '#db2777', '#c2410c', '#0f766e',
  '#7c3aed', '#4338ca', '#15803d', '#1d4ed8', '#be123c',
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface Props {
  student: DrillDownStudent;
}

export default function DrillDownHeader({ student }: Props) {
  const router = useRouter();
  const color = avatarColor(student.id);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(232,232,240,0.08)',
        flexShrink: 0,
      }}
    >
      {/* Back button */}
      <button
        onClick={() => router.push('/teacher/progress')}
        aria-label="Back to students"
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(232,232,240,0.5)',
          fontSize: 20,
          cursor: 'pointer',
          padding: '0 6px 0 0',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ‹
      </button>

      {/* Avatar */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.92)',
          flexShrink: 0,
        }}
      >
        {student.initials}
      </div>

      {/* Name */}
      <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(232,232,240,0.9)' }}>
        {student.name}
      </span>

      {/* Journey tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {student.journeyEnrollments.map((je) => (
          <span
            key={je.journeyId}
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '3px 8px',
              borderRadius: 4,
              background: 'rgba(124,58,237,0.15)',
              color: '#a78bfa',
              border: '1px solid rgba(124,58,237,0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            {je.title}
          </span>
        ))}
      </div>
    </div>
  );
}
