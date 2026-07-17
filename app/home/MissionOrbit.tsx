'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { PLANET_STATE_THEME } from '@/lib/planet-state-themes';
import { t } from '@/lib/i18n';
import type { MissionSummary } from '@/lib/student-home';
import HyperdriveStreaks from '@/components/HyperdriveStreaks';

// Handoff flag: set just before navigating so the landscape page knows to keep
// the hyperdrive overlay running (instead of its SYNCING text) until the map
// is ready. Read-and-cleared by app/landscape/page.tsx.
export const WARP_ENTRY_FLAG = 'astroli-warp-entry';

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

// Visual sort: completed (past) → active (now) → choosable → locked (future)
const STATE_PRIORITY: Record<OrbitState, number> = { completed: 0, active: 1, choosable: 2, locked: 3 };

function toOrbitState(m: MissionSummary, isFamilyClass: boolean, hasActive: boolean): OrbitState {
  if (m.state === 'active')    return 'active';
  if (m.state === 'completed') return 'completed';
  if (m.state === 'locked' && isFamilyClass && !hasActive) return 'choosable';
  return 'locked';
}

interface OrbitPlanetProps {
  mission:       MissionSummary;
  orbitState:    OrbitState;
  index:         number;
  classId:       string;
  language:      'en' | 'he';
  reducedMotion: boolean;
}

function OrbitPlanet({ mission, orbitState: state, index, classId, language, reducedMotion }: OrbitPlanetProps) {
  const router    = useRouter();
  const [hovered,    setHovered]    = useState(false);
  const [activating, setActivating] = useState(false);

  const themeKey      = state === 'choosable' ? 'active' : state;
  const theme         = PLANET_STATE_THEME[themeKey];
  const isInteractive = state !== 'locked';

  const orbSize = state === 'active'
    ? 'clamp(56px, 13vw, 72px)'
    : 'clamp(44px, 10vw, 56px)';

  const handleClick = async () => {
    if (state === 'active')    { router.push(`/landscape?classId=${classId}`); return; }
    if (state === 'completed') { router.push(`/landscape?reviewMissionId=${mission.id}&classId=${classId}`); return; }
    if (state !== 'choosable' || activating) return;

    setActivating(true);
    const t0 = Date.now();
    try {
      const res = await fetch('/api/student/mission-activate', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ missionId: mission.id, classId }),
      });
      if (!res.ok) throw new Error(`mission-activate ${res.status}`);

      // Give the streaks a beat before the route swap; the landscape keeps the
      // same overlay running (via WARP_ENTRY_FLAG) until the map is ready.
      const remaining = Math.max(0, 600 - (Date.now() - t0));
      setTimeout(() => {
        try { sessionStorage.setItem(WARP_ENTRY_FLAG, '1'); } catch {}
        router.push(`/landscape?classId=${classId}`);
      }, remaining);
    } catch (err) {
      console.error('[MissionOrbit] mission activation failed:', err);
      setActivating(false);
    }
  };

  const glowStyle = theme.glow !== 'none'
    ? `0 0 24px ${theme.glow}, 0 0 48px rgba(${theme.rgb},0.25), inset -8px -6px 20px rgba(0,0,0,0.5)`
    : 'inset -8px -6px 20px rgba(0,0,0,0.5)';

  const cta: { label: string; color: string; chipBg: string } =
    state === 'active'    ? { label: t('orbitContinue', language), color: '#cd9bff',              chipBg: 'rgba(205,155,255,0.18)' } :
    state === 'completed' ? { label: t('doneReview', language),    color: 'rgba(0,212,176,0.9)', chipBg: 'rgba(0,212,176,0.15)'  } :
    state === 'choosable' ? { label: t('orbitIgnite', language),   color: '#cd9bff',              chipBg: 'rgba(205,155,255,0.18)' } :
                            { label: t('orbitLocked', language),   color: 'rgba(255,255,255,0.3)', chipBg: 'rgba(255,255,255,0.06)' };

  const titleColor =
    state === 'active'    ? 'rgba(255,255,255,0.95)' :
    state === 'completed' ? 'rgba(255,255,255,0.7)'  :
    state === 'choosable' ? 'rgba(255,255,255,0.85)' :
                            'rgba(255,255,255,0.3)';

  const dir = language === 'he' ? 'rtl' : 'ltr';

  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? `${mission.title} — ${cta.label}` : undefined}
      onClick={isInteractive ? handleClick : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
      } : undefined}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        width: 116, position: 'relative',
        cursor: isInteractive ? 'pointer' : 'default',
      }}
      onMouseEnter={() => isInteractive && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hyperdrive Streak launch overlay — fires when a choosable planet is initiated */}
      {activating && (
        <motion.div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <div style={{ position: 'absolute', inset: 0, background: '#070510' }} />
          <HyperdriveStreaks />
          {/* Planet rockets to vanishing point */}
          <motion.div
            style={{
              width: 64, height: 64, borderRadius: '50%', position: 'relative', zIndex: 2,
              background: `radial-gradient(circle at 32% 28%, ${theme.highlight} 0%, ${theme.mid} 42%, ${theme.core} 100%)`,
              boxShadow: `0 0 50px rgba(${theme.rgb},0.9)`,
            }}
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.55, 0, 1, 0.45] }}
          />
        </motion.div>
      )}

      {/* Hover tooltip — appears above the orb */}
      {hovered && (
        <div
          style={{
            position:       'absolute',
            bottom:         ORB_ZONE_HEIGHT + 20,
            left:           '50%',
            transform:      'translateX(-50%)',
            background:     'rgba(20,16,30,0.97)',
            border:         '1px solid rgba(205,155,255,0.22)',
            borderRadius:   12,
            padding:        '10px 14px 11px',
            zIndex:         10,
            pointerEvents:  'none',
            backdropFilter: 'blur(10px)',
            boxShadow:      '0 8px 32px rgba(0,0,0,0.5)',
            minWidth:       160,
            maxWidth:       268,
            textAlign:      'center',
            direction:      language === 'he' ? 'rtl' : 'ltr',
          }}
        >
          {mission.question && (
            <>
              <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(205,155,255,0.7)', margin: '0 0 6px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {t('orbitBigQuestion', language)}
              </p>
              <p style={{ fontSize: 12, fontStyle: 'normal', color: 'rgba(255,255,255,0.92)', margin: 0, lineHeight: 1.4 }}>
                {mission.question}
              </p>
            </>
          )}
          {mission.planetCount != null && (
            <div style={{ marginTop: 9, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                <circle cx="5.5" cy="5.5" r="4.5" stroke="rgba(205,155,255,0.6)" strokeWidth="1"/>
                <ellipse cx="5.5" cy="5.5" rx="2" ry="4.5" stroke="rgba(205,155,255,0.4)" strokeWidth="0.75"/>
              </svg>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}>
                {t('orbitWorldsLabel', language).replace('{n}', String(mission.planetCount))}
              </span>
            </div>
          )}
          {/* Arrow pointing down */}
          <div style={{
            position:     'absolute',
            bottom:       -5,
            left:         '50%',
            width:        8,
            height:       8,
            background:   'rgba(20,16,30,0.97)',
            borderBottom: '1px solid rgba(205,155,255,0.22)',
            borderRight:  '1px solid rgba(205,155,255,0.22)',
            transform:    'translateX(-50%) rotate(45deg)',
          }} />
        </div>
      )}

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
            style={{
              width:        orbSize,
              height:       orbSize,
              borderRadius: '50%',
              background:   `radial-gradient(circle at 32% 28%, ${theme.highlight} 0%, ${theme.mid} 42%, ${theme.core} 100%)`,
              boxShadow:    glowStyle,
              opacity:      state === 'completed' ? 0.65 : state === 'locked' ? 0.4 : theme.dimOpacity,
              filter:       state === 'locked' ? 'saturate(0.25)' : theme.saturate < 1 ? `saturate(${theme.saturate})` : undefined,
              position:     'relative',
              transition:   'transform 0.15s ease',
              transform:    hovered && isInteractive ? 'scale(1.1)' : 'scale(1)',
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
            {/* Lock icon centered in locked orb */}
            {state === 'locked' && (
              <div
                aria-hidden
                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="9" height="12" viewBox="0 0 9 12" fill="none">
                  <rect x="0.5" y="5" width="8" height="6.5" rx="1.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
                  <path d="M2.5 5V3.5a2 2 0 0 1 4 0V5" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeLinecap="round"/>
                </svg>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Mission title — clamped to two lines */}
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
          width:           '100%',
        }}
      >
        {mission.title}
      </span>

      {/* State chip */}
      <span
        className="font-space"
        dir={dir}
        style={{
          fontSize:        9,
          letterSpacing:   '0.12em',
          textTransform:   'uppercase',
          color:           cta.color,
          whiteSpace:      'nowrap',
          background:      cta.chipBg,
          padding:         '3px 10px',
          borderRadius:    20,
          display:         'inline-block',
        }}
      >
        {cta.label}
      </span>
    </div>
  );
}

export default function MissionOrbit({ missions, classId, isFamilyClass, hasActive, language, reducedMotion }: MissionOrbitProps) {
  // Sort: completed (past) left → active (now) → choosable → locked (future) right.
  // Within each group, preserve the original DB order.
  const sorted = [...missions].sort((a, b) => {
    const pa = STATE_PRIORITY[toOrbitState(a, isFamilyClass, hasActive)];
    const pb = STATE_PRIORITY[toOrbitState(b, isFamilyClass, hasActive)];
    if (pa !== pb) return pa - pb;
    return a.order - b.order;
  });

  const totalCount     = sorted.length;
  const completedCount = sorted.filter(m => toOrbitState(m, isFamilyClass, hasActive) === 'completed').length;
  const progressPct    = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const progressLabel  = t('missionsDoneOf', language)
    .replace('{n}',     String(completedCount))
    .replace('{total}', String(totalCount));

  return (
    <div style={{ margin: '0 -24px' }}>
      {/* Progress bar */}
      <div style={{ padding: '0 24px', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>
          {progressLabel}
        </span>
        <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 5 }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg,rgba(0,212,176,0.7),rgba(205,155,255,0.7))', borderRadius: 2, transition: 'width 0.4s ease' }} />
        </div>
      </div>

    <div
      style={{
        position: 'relative',
        display:  'flex',
        // Negative margin reclaims the card's p-6 (24px) padding so planets
        // spread to the full inner edge of the card.
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        padding:        '16px 0 8px',
        margin:         '0',
      }}
    >
      {/* Dashed orbit line through orb centers */}
      {sorted.length > 1 && (
        <div
          aria-hidden
          style={{
            position:      'absolute',
            left:          58,
            right:         58,
            top:           16 + ORB_ZONE_HEIGHT / 2,
            height:        0,
            borderTop:     '1px dashed rgba(255,255,255,0.12)',
            pointerEvents: 'none',
          }}
        />
      )}

      {sorted.map((mission, i) => (
        <OrbitPlanet
          key={mission.id}
          mission={mission}
          orbitState={toOrbitState(mission, isFamilyClass, hasActive)}
          index={i}
          classId={classId}
          language={language}
          reducedMotion={reducedMotion}
        />
      ))}
    </div>
    </div>
  );
}
