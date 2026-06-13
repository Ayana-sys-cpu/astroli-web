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
          background: 'rgba(14,165,233,0.08)',
          border: '1px solid rgba(14,165,233,0.25)',
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <span className="breathe" style={{ color: '#0EA5E9', fontSize: 10 }}>●</span>
        <span
          className="font-space font-bold"
          style={{ fontSize: 11, letterSpacing: '0.1em', color: '#0369A1' }}
        >
          MISSION {mission.order} — ACTIVE
        </span>
      </div>
    );
  }

  return (
    <div
      className="glass-panel"
      style={{
        padding: '20px 24px',
        marginBottom: 20,
      }}
    >
      <p
        className="font-space font-bold"
        style={{ fontSize: 13, letterSpacing: '0.08em', color: 'rgba(26,26,46,0.4)', marginBottom: 6 }}
      >
        MISSION {mission.order}
      </p>
      <p
        className="font-inter"
        style={{ fontSize: 15, color: '#1a1a2e', marginBottom: 18, fontWeight: 500 }}
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
            ? 'rgba(14,165,233,0.1)'
            : 'linear-gradient(120deg, #0EA5E9, #0369A1)',
          color: '#fff',
          border: '1px solid rgba(14,165,233,0.4)',
          cursor: activating ? 'not-allowed' : 'pointer',
          opacity: activating ? 0.6 : 1,
        }}
      >
        {activating ? 'Activating…' : 'Activate Mission'}
      </button>
      <p
        className="font-inter"
        style={{ fontSize: 12, color: 'rgba(26,26,46,0.3)', marginTop: 12 }}
      >
        Activate to start tracking this session.
      </p>
    </div>
  );
}
