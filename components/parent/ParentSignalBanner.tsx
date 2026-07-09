'use client';
import type { SignalType } from '@/lib/signals';
import { getSignalCopy } from '@/lib/parent-signal-copy';

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#92400e" stroke="#92400e" strokeWidth="0.5"/>
  </svg>
);

const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="#166534" stroke="#166534" strokeWidth="0.5"/>
  </svg>
);

const WarningIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="#991b1b" strokeWidth="1.5"/>
    <line x1="12" y1="8" x2="12" y2="13" stroke="#991b1b" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="16.5" r="0.8" fill="#991b1b"/>
  </svg>
);

type BannerVariant = 'achievement' | 'no-activity' | 'grace';

const CONFIGS: Record<BannerVariant, { icon: React.ReactNode; bg: string; border: string; iconBg: string }> = {
  achievement: {
    icon: <SparkleIcon />,
    bg: 'rgba(220,252,231,0.8)',
    border: 'rgba(74,222,128,0.3)',
    iconBg: 'rgba(74,222,128,0.2)',
  },
  'no-activity': {
    icon: <MoonIcon />,
    bg: 'rgba(254,243,199,0.85)',
    border: 'rgba(251,191,36,0.3)',
    iconBg: 'rgba(251,191,36,0.2)',
  },
  grace: {
    icon: <WarningIcon />,
    bg: 'rgba(254,226,226,0.8)',
    border: 'rgba(252,165,165,0.4)',
    iconBg: 'rgba(252,165,165,0.2)',
  },
};

function signalToVariant(signalType: SignalType): BannerVariant {
  if (signalType === 'breakthrough') return 'achievement';
  if (signalType === 'non_engagement') return 'no-activity';
  return 'grace';
}

interface Props {
  signalType: SignalType;
  studentFirstName: string;
  journeyTitle: string;
}

export default function ParentSignalBanner({ signalType, studentFirstName, journeyTitle }: Props) {
  const variant = signalToVariant(signalType);
  const cfg = CONFIGS[variant];
  const copy = getSignalCopy(signalType);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 10,
        margin: '0 20px 12px',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: cfg.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
      }}>
        {cfg.icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.55 }}>
          {copy.headline(studentFirstName, journeyTitle)}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(26,26,46,0.6)', lineHeight: 1.5 }}>
          {copy.conversationStarter(studentFirstName, journeyTitle)}
        </p>
      </div>
    </div>
  );
}
