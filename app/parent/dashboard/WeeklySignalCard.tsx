export type WeeklySignal = {
  signalType: 'breakthrough' | 'grace_completion' | 'stuck' | 'non_engagement';
  signalCreatedAt: string;
  headline: string;
  conversationStarter: string;
};

const ICON: Record<WeeklySignal['signalType'], string> = {
  breakthrough: '✦',
  grace_completion: '◆',
  stuck: '◐',
  non_engagement: '○',
};

const ACCENT: Record<WeeklySignal['signalType'], string> = {
  breakthrough: '#8B00FF',
  grace_completion: '#D97706',
  stuck: '#00A3A3',
  non_engagement: 'rgba(26,26,46,0.4)',
};

export default function WeeklySignalCard({ signal }: { signal: WeeklySignal }) {
  const accent = ACCENT[signal.signalType];
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(26,26,46,0.08)',
      borderRadius: 12,
      padding: '14px 16px',
      boxShadow: '0 1px 4px rgba(26,26,46,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: 16, lineHeight: 1, color: accent, marginTop: 2 }}>{ICON[signal.signalType]}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{signal.headline}</p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(26,26,46,0.5)', fontStyle: 'italic' }}>
            &ldquo;{signal.conversationStarter}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
