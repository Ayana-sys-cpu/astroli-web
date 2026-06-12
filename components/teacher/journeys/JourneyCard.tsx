'use client';
import { useRouter } from 'next/navigation';
import type { JourneyStatus } from '@/app/api/teacher/journeys-overview/route';

export interface JourneyCardData {
  id:             string;
  title:          string;
  status:         JourneyStatus;
  statusNote:     string;
  studentCount:   number;
  attentionCount: number;
  coverGradient:  { from: string; mid: string; accent: string };
}

const BADGE: Record<JourneyStatus, { label: string; color: string; bg: string; border: string }> = {
  live:    { label: '● LIVE',    color: '#00D4FF', bg: 'rgba(0,212,255,0.1)',    border: 'rgba(0,212,255,0.3)'    },
  voting:  { label: '🗳 VOTING', color: '#a78bfa', bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.3)'   },
  pending: { label: '⏳ PENDING', color: '#FFD600', bg: 'rgba(255,214,0,0.08)',  border: 'rgba(255,214,0,0.25)'   },
  done:    { label: '✓ DONE',    color: '#00F5A0', bg: 'rgba(0,245,160,0.07)',  border: 'rgba(0,245,160,0.25)'   },
  idle:    { label: '○ IDLE',    color: 'rgba(232,232,240,0.35)', bg: 'rgba(232,232,240,0.04)', border: 'rgba(232,232,240,0.12)' },
};

const CARD_BORDER: Record<JourneyStatus, string> = {
  live:    'rgba(0,212,255,0.18)',
  voting:  'rgba(124,58,237,0.2)',
  pending: 'rgba(255,214,0,0.15)',
  done:    'rgba(232,232,240,0.06)',
  idle:    'rgba(232,232,240,0.06)',
};

const STATUS_NOTE_COLOR: Record<JourneyStatus, string> = {
  live:    'rgba(0,212,255,0.6)',
  voting:  '#a78bfa',
  pending: '#FFD600',
  done:    'rgba(0,245,160,0.45)',
  idle:    'rgba(232,232,240,0.25)',
};

export default function JourneyCard({ journey }: { journey: JourneyCardData }) {
  const router = useRouter();
  const badge  = BADGE[journey.status];
  const { from, mid, accent } = journey.coverGradient;
  const taglineVisible = journey.status === 'live';
  const cardOpacity    = journey.status === 'done' ? 0.55 : 1;

  return (
    <div
      onClick={() => router.push(`/teacher/journey/${journey.id}`)}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        border: `1px solid ${CARD_BORDER[journey.status]}`,
        background: 'rgba(232,232,240,0.02)',
        display: 'flex',
        flexDirection: 'column',
        opacity: cardOpacity,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 14px 36px rgba(0,0,0,0.45)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      {/* Cover */}
      <div style={{
        height: 80,
        position: 'relative',
        background: `linear-gradient(135deg, ${from} 0%, ${mid} 60%, ${accent} 100%)`,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        padding: '10px 12px',
        flexShrink: 0,
      }}>
        <button
          onClick={e => { e.stopPropagation(); }}
          style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, opacity: 0.75, cursor: 'pointer',
          }}
          aria-label="Upload cover image"
        >
          📷
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Journey name */}
        <div style={{
          fontSize: 16, fontWeight: 900,
          color: '#E8E8F0',
          letterSpacing: '0.04em',
          lineHeight: 1.25,
          marginBottom: 5,
          fontFamily: 'var(--font-space)',
        }}>
          {journey.title}
        </div>

        {/* Tagline — LIVE only; space always reserved for layout consistency */}
        <div style={{
          fontSize: 11,
          fontFamily: 'var(--font-inter)',
          fontWeight: 400,
          letterSpacing: '0.02em',
          lineHeight: 1.4,
          marginBottom: 16,
          color: 'rgba(232,232,240,0.38)',
          visibility: taglineVisible ? 'visible' : 'hidden',
        }}>
          {' '}
        </div>

        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{
            fontSize: 8, fontWeight: 700,
            letterSpacing: '0.15em',
            padding: '4px 11px',
            borderRadius: 20,
            whiteSpace: 'nowrap',
            color: badge.color,
            background: badge.bg,
            border: `1px solid ${badge.border}`,
          }}>
            {badge.label}
          </span>
          <span style={{
            fontSize: 9,
            letterSpacing: '0.07em',
            fontFamily: 'var(--font-inter)',
            color: STATUS_NOTE_COLOR[journey.status],
          }}>
            {journey.statusNote}
          </span>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          marginTop: 'auto',
        }}>
          <span style={{ fontSize: 9, color: 'rgba(232,232,240,0.3)', letterSpacing: '0.07em' }}>
            👥 {journey.studentCount} students
          </span>
          {journey.attentionCount > 0 ? (
            <span style={{ fontSize: 9, color: '#FFD600', letterSpacing: '0.07em' }}>
              ⚠️ {journey.attentionCount} need attention
            </span>
          ) : (
            <span style={{ fontSize: 9, color: 'rgba(0,245,160,0.45)', letterSpacing: '0.07em' }}>
              ✅ No alerts
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
