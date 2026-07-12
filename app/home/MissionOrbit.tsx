'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { PLANET_STATE_THEME } from '@/lib/planet-state-themes';
import { t } from '@/lib/i18n';
import type { MissionSummary } from '@/lib/student-home';

export interface MissionOrbitProps {
  missions:      MissionSummary[];
  classId:       string;
  isFamilyClass: boolean;
  hasActive:     boolean;
  language:      'en' | 'he';
  reducedMotion: boolean;
}

type OrbitState = 'active' | 'completed' | 'choosable' | 'locked';

// Tallest orb (active). Every orb centers inside a zone of this height so the
// dashed orbit line passes through all planet centers regardless of label height.
const ORB_ZONE_HEIGHT = 72;

interface OrbitPlanetProps {
  mission:       MissionSummary;
  index:         number;
  classId:       string;
  isFamilyClass: boolean;
  hasActive:     boolean;
  language:      'en' | 'he';
  reducedMotion: boolean;
}

function OrbitPlanet({ mission, index, classId, isFamilyClass, hasActive, language, reducedMotion }: OrbitPlanetProps) {
  const router = useRouter();

  const state: OrbitState =
    mission.state === 'active'    ? 'active'    :
    mission.state === 'completed' ? 'completed' :
    (mission.state === 'locked' && isFamilyClass && !hasActive) ? 'choosable' :
    'locked';

  const themeKey = state === 'choosable' ? 'active' : state;
  const theme    = PLANET_STATE_THEME[themeKey];
  const isInteractive = state !== 'locked';

  // Active planet is visually dominant; others have a safe minimum for touch targets
  const orbSize = state === 'active'
    ? 'clamp(56px, 13vw, 72px)'
    : 'clamp(44px, 10vw, 56px)';

  const handleClick = () => {
    if (state === 'active')    router.push(`/landscape?classId=${classId}`);
    if (state === 'completed') router.push(`/landscape?reviewMissionId=${mission.id}&classId=${classId}`);
    if (state === 'choosable') router.push(`/family/missions?classId=${classId}`);
  };

  const glowStyle = theme.glow !== 'none'
    ? `0 0 24px ${theme.glow}, 0 0 48px rgba(${theme.rgb},0.25), inset -8px -6px 20px rgba(0,0,0,0.5)`
    : 'inset -8px -6px 20px rgba(0,0,0,0.5)';

  const cta: { label: string; color: string } =
    state === 'active'    ? { label: t('orbitContinue', language), color: '#cd9bff' } :
    state === 'completed' ? { label: t('doneReview', language),    color: 'rgba(0,212,176,0.9)' } :
    state === 'choosable' ? { label: t('orbitIgnite', language),   color: '#cd9bff' } :
                            { label: t('orbitLocked', language),   color: 'rgba(255,255,255,0.28)' };

  const titleColor =
    state === 'active'    ? 'rgba(255,255,255,0.95)' :
    state === 'completed' ? 'rgba(255,255,255,0.7)'  :
    state === 'choosable' ? 'rgba(255,255,255,0.85)' :
                            'rgba(255,255,255,0.3)';

  const dir = language === 'he' ? 'rtl' : 'ltr';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 96 }}>
      <div style={{ height: ORB_ZONE_HEIGHT, display: 'flex', alignItems: 'center' }}>
        <motion.div
          animate={reducedMotion ? {} : { y: [0, -6, 0] }}
          transition={reducedMotion ? {} : {
            repeat:   Infinity,
            duration: 6 + index,
            delay:    index * 1.5,
            ease:     'easeInOut',
          }}
          style={{ position: 'relative' }}
        >
          {/* Active planet: two pulsing rings */}
          {state === 'active' && !reducedMotion && (
            <>
              <motion.div
                aria-hidden
                animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.1, 0.55] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', inset: -10, borderRadius: '50%',
                  border: '1px solid rgba(205,155,255,0.45)',
                  pointerEvents: 'none',
                }}
              />
              <motion.div
                aria-hidden
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                style={{
                  position: 'absolute', inset: -20, borderRadius: '50%',
                  border: '1px solid rgba(205,155,255,0.2)',
                  pointerEvents: 'none',
                }}
              />
            </>
          )}

          {/* Choosable: dashed invitation ring */}
          {state === 'choosable' && (
            <div
              aria-hidden
              style={{
                position: 'absolute', inset: -6, borderRadius: '50%',
                border: '1.5px dashed rgba(205,155,255,0.55)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Planet orb */}
          <div
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            aria-label={isInteractive ? `${mission.title} — ${cta.label}` : undefined}
            onClick={isInteractive ? handleClick : undefined}
            onKeyDown={isInteractive ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
            } : undefined}
            style={{
              width:        orbSize,
              height:       orbSize,
              borderRadius: '50%',
              background:   `radial-gradient(circle at 32% 28%, ${theme.highlight} 0%, ${theme.mid} 42%, ${theme.core} 100%)`,
              boxShadow:    glowStyle,
              opacity:      theme.dimOpacity,
              filter:       theme.saturate < 1 ? `saturate(${theme.saturate})` : undefined,
              cursor:       isInteractive ? 'pointer' : 'default',
              position:     'relative',
            }}
          >
            {/* Completed checkmark badge */}
            {state === 'completed' && (
              <div
                aria-hidden
                style={{
                  position:       'absolute',
                  bottom:         -3,
                  right:          -3,
                  width:          16,
                  height:         16,
                  borderRadius:   '50%',
                  background:     '#00d4b0',
                  border:         '2px solid #14121d',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize:       9,
                  color:          '#000',
                  fontWeight:     700,
                  lineHeight:     1,
                }}
              >
                ✓
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Mission title — clamped to two lines so long/Hebrew titles degrade gracefully */}
      <span
        dir={dir}
        style={{
          fontSize:        11,
          lineHeight:      1.35,
          fontWeight:      state === 'active' ? 700 : 500,
          textAlign:       'center',
          color:           titleColor,
          display:         '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow:        'hidden',
        }}
      >
        {mission.title}
      </span>

      {/* State CTA: continue / done · review / ignite / locked */}
      <span
        className="font-space"
        dir={dir}
        style={{
          fontSize:      9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:         cta.color,
          whiteSpace:    'nowrap',
        }}
      >
        {cta.label}
      </span>
    </div>
  );
}

export default function MissionOrbit({ missions, classId, isFamilyClass, hasActive, language, reducedMotion }: MissionOrbitProps) {
  const sorted = [...missions].sort((a, b) => a.order - b.order);

  return (
    <div
      style={{
        position:       'relative',
        display:        'flex',
        justifyContent: 'space-around',
        alignItems:     'flex-start',
        padding:        '16px 0 8px',
        flexWrap:       'wrap',
        gap:            8,
      }}
    >
      {/* Dashed orbit line through the orb centers — only meaningful with 2+ missions */}
      {sorted.length > 1 && (
        <div
          aria-hidden
          style={{
            position:    'absolute',
            left:        '5%',
            right:       '5%',
            top:         16 + ORB_ZONE_HEIGHT / 2,
            height:      0,
            borderTop:   '1px dashed rgba(255,255,255,0.12)',
            pointerEvents: 'none',
          }}
        />
      )}

      {sorted.map((mission, i) => (
        <OrbitPlanet
          key={mission.id}
          mission={mission}
          index={i}
          classId={classId}
          isFamilyClass={isFamilyClass}
          hasActive={hasActive}
          language={language}
          reducedMotion={reducedMotion}
        />
      ))}
    </div>
  );
}
