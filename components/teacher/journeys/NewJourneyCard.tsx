'use client';
import { useRouter } from 'next/navigation';

export default function NewJourneyCard() {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push('/teacher/journeys/new')}
      style={{
        borderRadius: 16,
        border: '1px dashed rgba(139,0,255,0.3)',
        background: 'rgba(139,0,255,0.03)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '40px 24px',
        cursor: 'pointer',
        minHeight: 240,
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(139,0,255,0.06)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,0,255,0.5)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(139,0,255,0.03)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,0,255,0.3)';
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: 'rgba(139,0,255,0.08)',
        border: '1px solid rgba(139,0,255,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, color: '#8B00FF',
      }}>
        +
      </div>
      <div style={{
        fontSize: 9, fontWeight: 700,
        letterSpacing: '0.18em',
        color: '#8B00FF',
        fontFamily: 'var(--font-space)',
      }}>
        NEW JOURNEY
      </div>
      <div style={{
        fontSize: 10,
        color: 'rgba(26,26,46,0.3)',
        fontFamily: 'var(--font-inter)',
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        Connect a Google Classroom<br />and choose a curriculum
      </div>
    </div>
  );
}
