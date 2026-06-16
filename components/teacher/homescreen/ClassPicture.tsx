import type { ClassInsight } from '@/lib/homescreen';
import KineticText from '@/components/KineticText';

const INSIGHT_CONFIG = {
  breakthrough:     { icon: '🌟', color: '#B45309', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)'  },
  grace_completion: { icon: '🔴', color: '#FF0080', bg: 'rgba(255,0,128,0.06)',  border: 'rgba(255,0,128,0.2)'   },
  stuck:            { icon: '🔄', color: '#0369A1', bg: 'rgba(14,165,233,0.06)', border: 'rgba(14,165,233,0.2)'  },
  non_engagement:   { icon: '⚠️', color: '#64748B', bg: 'rgba(100,116,139,0.06)',border: 'rgba(100,116,139,0.2)' },
  coverage:         { icon: '📉', color: 'rgba(26,26,46,0.45)', bg: 'rgba(26,26,46,0.03)', border: 'rgba(26,26,46,0.08)' },
  progress:         { icon: '✅', color: '#059669', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)' },
} as const;

interface Props { insights: ClassInsight[]; }

export default function ClassPicture({ insights }: Props) {
  const isGrid = insights.length > 1;

  return (
    <div style={{
      display: isGrid ? 'grid' : 'flex',
      gridTemplateColumns: isGrid ? '1fr 1fr' : undefined,
      flexDirection: isGrid ? undefined : 'column',
      gap: 10,
    }}>
      {insights.map((insight, i) => {
        const cfg = INSIGHT_CONFIG[insight.signalType as keyof typeof INSIGHT_CONFIG] ?? INSIGHT_CONFIG.coverage;
        return (
          <div key={i} style={{
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderRadius: 12,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
            <p style={{
              margin: 0,
              fontSize: 13,
              fontFamily: 'var(--font-inter)',
              color: 'rgba(26,26,46,0.75)',
              lineHeight: 1.5,
            }}>
              <KineticText text={insight.text} />
            </p>
          </div>
        );
      })}
    </div>
  );
}
