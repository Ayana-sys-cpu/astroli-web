import type { ClassInsight } from '@/app/api/teacher/homescreen/route';

const INSIGHT_CONFIG = {
  breakthrough:     { icon: '🌟', color: '#FFD600', bg: 'rgba(255,214,0,0.06)',   border: 'rgba(255,214,0,0.2)'    },
  grace_completion: { icon: '🔴', color: '#FF0080', bg: 'rgba(255,0,128,0.06)',   border: 'rgba(255,0,128,0.2)'   },
  stuck:            { icon: '🔄', color: '#00F5D4', bg: 'rgba(0,245,212,0.06)',   border: 'rgba(0,245,212,0.2)'   },
  non_engagement:   { icon: '⚠️', color: '#7C3AED', bg: 'rgba(124,58,237,0.06)',  border: 'rgba(124,58,237,0.2)'  },
  coverage:         { icon: '📉', color: 'rgba(232,232,240,0.5)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)' },
  progress:         { icon: '✅', color: '#00FF88', bg: 'rgba(0,255,136,0.05)',   border: 'rgba(0,255,136,0.15)'  },
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
              color: 'rgba(232,232,240,0.75)',
              lineHeight: 1.5,
            }}>
              {insight.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
