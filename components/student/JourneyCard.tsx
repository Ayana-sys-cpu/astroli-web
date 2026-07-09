'use client';
import type { HomeJourney } from '@/lib/student-home';
import { t, type Lang } from '@/lib/i18n';

interface JourneyCardProps {
  journey: HomeJourney;
  onClick: () => void;
}

interface Accent {
  text:     string;
  border:   string;
  glow:     string;
  glowSoft: string;
  badgeBg:  string;
  ctaBg:    string;
  ctaFg:    string;
}

const ACCENT: Record<HomeJourney['status'], Accent> = {
  live:    { text: '#d8b4fe', border: 'rgba(168,85,247,0.50)',  glow: 'rgba(168,85,247,0.20)',  glowSoft: 'rgba(168,85,247,0.08)',  badgeBg: 'rgba(168,85,247,0.15)',  ctaBg: '#7c3aed', ctaFg: '#fff' },
  voting:  { text: '#ff7fc4', border: 'rgba(255,0,128,0.35)',   glow: 'rgba(255,0,128,0.16)',   glowSoft: 'rgba(255,0,128,0.06)',   badgeBg: 'rgba(255,0,128,0.13)',   ctaBg: '#FF0080', ctaFg: '#fff' },
  pending: { text: '#c4b5fd', border: 'rgba(139,92,246,0.28)',  glow: 'rgba(139,92,246,0.10)',  glowSoft: 'rgba(139,92,246,0.04)',  badgeBg: 'rgba(139,92,246,0.10)',  ctaBg: 'transparent', ctaFg: '#c4b5fd' },
  done:    { text: '#5ef0d8', border: 'rgba(0,245,212,0.35)',   glow: 'rgba(0,245,212,0.16)',   glowSoft: 'rgba(0,245,212,0.06)',   badgeBg: 'rgba(0,245,212,0.12)',   ctaBg: 'transparent', ctaFg: '#5ef0d8' },
  idle:    { text: 'rgba(255,255,255,0.3)',  border: 'rgba(255,255,255,0.06)', glow: 'rgba(255,255,255,0)', glowSoft: 'rgba(255,255,255,0)', badgeBg: 'rgba(255,255,255,0.04)', ctaBg: 'transparent', ctaFg: 'rgba(255,255,255,0.3)' },
};

function badgeLabel(journey: HomeJourney, lang: Lang): string {
  if (journey.status === 'live' && journey.studentMissionCompleted) return t('badgeMissionComplete', lang);
  if (journey.status === 'idle' && journey.isFamilyClass) return t('badgeIdleFamily', lang);
  const key = { live: 'badgeLive', voting: 'badgeVoting', pending: 'badgePending', done: 'badgeDone', idle: 'badgeIdle' } as const;
  return t(key[journey.status], lang);
}

function ctaLabel(journey: HomeJourney, lang: Lang): string {
  if (journey.status === 'live' && journey.studentMissionCompleted) return t('ctaRevisitJourney', lang);
  if (journey.status === 'idle' && journey.isFamilyClass) return t('ctaPickMission', lang);
  switch (journey.status) {
    case 'live':    return t('ctaContinueMission', lang);
    case 'voting':  return t('ctaVoteNow', lang);
    case 'pending': return t('ctaViewResults', lang);
    case 'done':    return t('ctaRevisitJourney', lang);
    default:        return '';
  }
}

function bodyText(journey: HomeJourney, lang: Lang): string {
  if (journey.status === 'live' && journey.studentMissionCompleted) {
    return journey.missionTitle
      ? t('bodyLiveMissionComplete', lang)
          .replace('{total}', String(journey.planetsTotal ?? 0))
          .replace('{title}', journey.missionTitle)
      : t('bodyLiveFallback', lang);
  }
  switch (journey.status) {
    case 'live':
      return journey.missionTitle
        ? t('bodyLive', lang)
            .replace('{n}', String(journey.planetsExplored ?? 0))
            .replace('{total}', String(journey.planetsTotal ?? 0))
            .replace('{title}', journey.missionTitle)
        : t('bodyLiveFallback', lang);
    case 'voting':  return t('bodyVoting', lang);
    case 'pending': return t('bodyPending', lang);
    case 'done':    return t('bodyDone', lang).replace('{n}', String(journey.completedMissionsCount ?? 0));
    case 'idle':
    default:        return t('bodyIdle', lang);
  }
}

export default function JourneyCard({ journey, onClick }: JourneyCardProps) {
  const lang: Lang  = journey.language ?? 'en';
  const isIdleFamily = journey.status === 'idle' && Boolean(journey.isFamilyClass);
  const accentKey   = (journey.status === 'live' && journey.studentMissionCompleted) ? 'done' : isIdleFamily ? 'pending' : journey.status;
  const accent      = ACCENT[accentKey];
  const clickable   = journey.status !== 'idle' || isIdleFamily;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className="text-left rounded-[22px] p-6 w-full transition-transform"
      style={{
        background: 'linear-gradient(145deg, #1a1726 0%, #14121d 100%)',
        border: `1px solid ${accent.border}`,
        boxShadow: `0 0 0 1px rgba(255,255,255,0.02) inset, 0 0 36px ${accent.glow}, 0 0 70px ${accent.glowSoft}`,
        cursor: clickable ? 'pointer' : 'default',
        opacity: journey.status === 'idle' && !isIdleFamily ? 0.55 : 1,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-1.5" style={{ color: '#b8aee0' }}>
            {journey.className}{journey.teacherName ? ` · ${journey.teacherName.toUpperCase()}` : ''}
          </p>
          <p className="font-bold text-lg text-white tracking-[-0.01em]">
            {journey.missionTitle ?? journey.className}
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.16em] uppercase whitespace-nowrap"
          style={{ color: accent.text, background: accent.badgeBg, border: `1px solid ${accent.border}` }}
        >
          {badgeLabel(journey, lang)}
        </div>
      </div>

      {journey.status === 'live' && (
        <div className="mb-4">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[9.5px] font-bold tracking-[0.14em] uppercase" style={{ color: '#b8aee0' }}>{t('planetsExploredLabel', lang)}</span>
            <span className="text-[13px] font-bold" style={{ color: accent.text }}>
              {journey.planetsExplored ?? 0} / {journey.planetsTotal ?? 0}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${journey.planetsTotal ? Math.round(((journey.planetsExplored ?? 0) / journey.planetsTotal) * 100) : 0}%`,
                background: accent.text,
              }}
            />
          </div>
        </div>
      )}

      {clickable && (
        <div
          className="flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[11px] font-bold tracking-[0.12em] uppercase"
          style={{
            background: accent.ctaBg,
            color:      accent.ctaFg,
            border:     accent.ctaBg === 'transparent' ? `1px solid ${accent.border}` : 'none',
          }}
        >
          {ctaLabel(journey, lang)}
        </div>
      )}
    </button>
  );
}
