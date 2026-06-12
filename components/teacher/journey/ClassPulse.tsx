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
        background: 'rgba(255,255,255,0.025)',
        borderTop: '1px solid rgba(232,232,240,0.07)',
        borderBottom: '1px solid rgba(232,232,240,0.07)',
        marginBottom: 24,
      }}
    >
      <span className="font-inter" style={{ fontSize: 14, color: '#E8E8F0' }}>
        <span style={{ fontWeight: 600 }}>{activeCount} / {totalCount}</span>
        {' '}actively exploring
      </span>
      <span style={{ color: 'rgba(232,232,240,0.25)', fontSize: 14 }}>·</span>
      <span
        className="font-inter"
        style={{
          fontSize: 14,
          color: attentionCount > 0 ? '#FF6B6B' : 'rgba(232,232,240,0.4)',
          fontWeight: attentionCount > 0 ? 600 : 400,
        }}
      >
        {attentionCount} need attention
      </span>
    </div>
  );
}
