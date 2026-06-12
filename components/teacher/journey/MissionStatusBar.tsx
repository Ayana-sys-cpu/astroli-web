'use client';

interface Mission {
  id: string;
  order: number;
  title: string;
}

interface MissionStatusBarProps {
  mission: Mission;
  isActive: boolean;
  onActivate: () => void;
  activating: boolean;
}

export default function MissionStatusBar({
  mission,
  isActive,
  onActivate,
  activating,
}: MissionStatusBarProps) {
  if (isActive) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 20px',
          background: 'rgba(0,212,255,0.08)',
          border: '1px solid rgba(0,212,255,0.25)',
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <span style={{ color: '#00D4FF', fontSize: 10 }}>●</span>
        <span
          className="font-space font-bold"
          style={{ fontSize: 11, letterSpacing: '0.1em', color: '#00D4FF' }}
        >
          MISSION {mission.order} — ACTIVE
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(232,232,240,0.12)',
        borderRadius: 14,
        padding: '20px 24px',
        marginBottom: 20,
      }}
    >
      <p
        className="font-space font-bold"
        style={{ fontSize: 13, letterSpacing: '0.08em', color: 'rgba(232,232,240,0.5)', marginBottom: 6 }}
      >
        MISSION {mission.order}
      </p>
      <p
        className="font-inter"
        style={{ fontSize: 15, color: '#E8E8F0', marginBottom: 18, fontWeight: 500 }}
      >
        {mission.title}
      </p>
      <button
        onClick={onActivate}
        disabled={activating}
        className="font-space font-bold"
        style={{
          padding: '10px 22px',
          borderRadius: 999,
          fontSize: 11,
          letterSpacing: '0.1em',
          background: activating
            ? 'rgba(0,212,255,0.15)'
            : 'linear-gradient(120deg, rgba(0,212,255,0.85), rgba(0,212,255,0.5))',
          color: '#0a1628',
          border: '1px solid rgba(0,212,255,0.4)',
          cursor: activating ? 'not-allowed' : 'pointer',
          opacity: activating ? 0.6 : 1,
        }}
      >
        {activating ? 'Activating…' : 'Activate Mission'}
      </button>
      <p
        className="font-inter"
        style={{ fontSize: 12, color: 'rgba(232,232,240,0.3)', marginTop: 12 }}
      >
        Activate to start tracking this session.
      </p>
    </div>
  );
}
