'use client';
import { useRouter } from 'next/navigation';
import type { JourneyStatus } from '@/lib/journey-status';

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
  live:    { label: '● LIVE',    color: '#0369A1', bg: 'rgba(14,165,233,0.1)',   border: 'rgba(14,165,233,0.3)'   },
  voting:  { label: '🗳 VOTING', color: '#8B00FF', bg: 'rgba(139,0,255,0.1)',   border: 'rgba(139,0,255,0.25)'   },
  pending: { label: '⏳ PENDING', color: '#B45309', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)'  },
  done:    { label: '✓ DONE',    color: '#059669', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)'  },
  idle:    { label: '○ IDLE',    color: 'rgba(26,26,46,0.35)', bg: 'rgba(26,26,46,0.04)', border: 'rgba(26,26,46,0.12)' },
};

const CARD_BORDER: Record<JourneyStatus, string> = {
  live:    'rgba(14,165,233,0.2)',
  voting:  'rgba(139,0,255,0.2)',
  pending: 'rgba(245,158,11,0.15)',
  done:    'rgba(26,26,46,0.06)',
  idle:    'rgba(26,26,46,0.06)',
};

const STATUS_NOTE_COLOR: Record<JourneyStatus, string> = {
  live:    '#0369A1',
  voting:  '#8B00FF',
  pending: '#B45309',
  done:    '#059669',
  idle:    'rgba(26,26,46,0.3)',
};

export default function JourneyCard({ journey }: { journey: JourneyCardData }) {
  const router = useRouter();
  const badge  = BADGE[journey.status];
  const { from, mid, accent } = journey.coverGradient;
  const taglineVisible = journey.status === 'live';
  const cardOpacity    = journey.status === 'done' ? 0.65 : 1;

  return (
    <div
      onClick={() => router.push(`/teacher/journey/${journey.id}`)}
      className="glass-card"
      style={{
        overflow: 'hidden',
        cursor: 'pointer',
        border: `1px solid ${CARD_BORDER[journey.status]}`,
        display: 'flex',
        flexDirection: 'column',
        opacity: cardOpacity,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 14px 36px rgba(139,0,255,0.15)';
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
            background: 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.3)',
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
          color: '#1a1a2e',
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
          color: 'rgba(26,26,46,0.35)',
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
          borderTop: '1px solid rgba(26,26,46,0.06)',
          marginTop: 'auto',
        }}>
          <span style={{ fontSize: 9, color: 'rgba(26,26,46,0.35)', letterSpacing: '0.07em' }}>
            👥 {journey.studentCount} students
          </span>
          {journey.attentionCount > 0 ? (
            <span style={{ fontSize: 9, color: '#B45309', letterSpacing: '0.07em' }}>
              ⚠️ {journey.attentionCount} need attention
            </span>
          ) : (
            <span style={{ fontSize: 9, color: '#059669', letterSpacing: '0.07em' }}>
              ✅ No alerts
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
