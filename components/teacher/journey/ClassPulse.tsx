interface ClassPulseProps {
  activeCount: number;
  totalCount: number;
  attentionCount: number;
}

export default function ClassPulse({ activeCount, totalCount, attentionCount }: ClassPulseProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        background: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.7)',
        borderBottom: '1px solid rgba(255,255,255,0.7)',
        marginBottom: 24,
      }}
    >
      <span className="font-inter breathe" style={{ fontSize: 14, color: '#1a1a2e' }}>
        <span style={{ fontWeight: 600 }}>{activeCount} / {totalCount}</span>
        {' '}actively exploring
      </span>
      <span style={{ color: 'rgba(26,26,46,0.2)', fontSize: 14 }}>·</span>
      <span
        className="font-inter"
        style={{
          fontSize: 14,
          color: attentionCount > 0 ? '#DC2626' : 'rgba(26,26,46,0.35)',
          fontWeight: attentionCount > 0 ? 600 : 400,
        }}
      >
        {attentionCount} need attention
      </span>
    </div>
  );
}
