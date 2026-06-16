// src/astroli-web/components/teacher/drill-down/DrillDownHeader.tsx
'use client';
import { useRouter } from 'next/navigation';
import type { DrillDownStudent } from '@/lib/drill-down-types';

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
        borderBottom: '1px solid rgba(26,26,46,0.08)',
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        flexShrink: 0,
      }}
    >
      {/* Back button — 44×44px touch target */}
      <button
        className="dd-btn"
        onClick={() => router.push('/teacher/progress')}
        aria-label="Back to students"
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(26,26,46,0.4)',
          fontSize: 20,
          cursor: 'pointer',
          padding: '0 10px 0 4px',
          lineHeight: 1,
          flexShrink: 0,
          minWidth: 44,
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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

      {/* Name + journey count */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>
          {student.name}
        </div>
        {student.journeyEnrollments.length > 0 && (
          <div style={{ fontSize: 11, color: 'rgba(26,26,46,0.45)', marginTop: 1 }}>
            {student.grade ? `${student.grade} · ` : ''}
            {student.journeyEnrollments.length} active {student.journeyEnrollments.length === 1 ? 'journey' : 'journeys'}
          </div>
        )}
      </div>

    </div>
  );
}
