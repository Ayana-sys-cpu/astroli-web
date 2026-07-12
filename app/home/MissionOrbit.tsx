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

  const missionLabel = t('orbitMissionN', language).replace('{n}', String(mission.order));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
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
          aria-label={isInteractive ? `${missionLabel}: ${mission.title}` : undefined}
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

      {/* Mission N label */}
      <span
        className="font-space"
        style={{
          fontSize:      9,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color:         'rgba(255,255,255,0.32)',
          whiteSpace:    'nowrap',
        }}
        dir={language === 'he' ? 'rtl' : 'ltr'}
      >
        {missionLabel}
      </span>

      {/* "Choose me" label only for choosable planets */}
      {state === 'choosable' && (
        <span
          className="font-space"
          style={{
            fontSize:      9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:         'rgba(205,155,255,0.7)',
          }}
          dir={language === 'he' ? 'rtl' : 'ltr'}
        >
          {t('chooseMe', language)}
        </span>
      )}
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
        alignItems:     'flex-end',
        padding:        '24px 4px 8px',
        minHeight:      100,
        flexWrap:       'wrap',
        gap:            8,
      }}
    >
      {/* Dashed orbit line — only meaningful with 2+ missions */}
      {sorted.length > 1 && (
        <div
          aria-hidden
          style={{
            position:    'absolute',
            left:        '5%',
            right:       '5%',
            top:         '42%',
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
