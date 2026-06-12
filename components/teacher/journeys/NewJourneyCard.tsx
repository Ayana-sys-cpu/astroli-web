'use client';
import { useRouter } from 'next/navigation';

export default function NewJourneyCard() {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push('/teacher/journeys/new')}
      style={{
        borderRadius: 16,
        border: '1px dashed rgba(124,58,237,0.3)',
        background: 'rgba(124,58,237,0.03)',
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
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(124,58,237,0.07)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.5)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(124,58,237,0.03)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.3)';
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: 'rgba(124,58,237,0.1)',
        border: '1px solid rgba(124,58,237,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, color: 'rgba(124,58,237,0.65)',
      }}>
        +
      </div>
      <div style={{
        fontSize: 9, fontWeight: 700,
        letterSpacing: '0.18em',
        color: 'rgba(124,58,237,0.55)',
        fontFamily: 'var(--font-space)',
      }}>
        NEW JOURNEY
      </div>
      <div style={{
        fontSize: 10,
        color: 'rgba(232,232,240,0.2)',
        fontFamily: 'var(--font-inter)',
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        Connect a Google Classroom<br />and choose a curriculum
      </div>
    </div>
  );
}
