'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

type Mission = { id: string; title: string; state: string; order: number };

const PLANET_THEMES: Record<number, { core: string; mid: string; highlight: string; glow: string; rgb: string; ring: boolean }> = {
  1: { core: '#200a35', mid: '#7b2fbe', highlight: '#f0c0ff', glow: '#cd9bff', rgb: '205,155,255', ring: true },
  2: { core: '#003a36', mid: '#00a88a', highlight: '#9ffff0', glow: '#00f5d4', rgb: '0,245,212',   ring: false },
  3: { core: '#3a1000', mid: '#cc4400', highlight: '#ffd09e', glow: '#ff7847', rgb: '255,120,71',  ring: false },
  4: { core: '#001835', mid: '#0066cc', highlight: '#b0daff', glow: '#4db8ff', rgb: '77,184,255',  ring: false },
  5: { core: '#1a2800', mid: '#44aa00', highlight: '#c8ff90', glow: '#88ff47', rgb: '136,255,71',  ring: false },
};
const FALLBACK = PLANET_THEMES[1];

interface MissionPlanetProps {
  mission:      Mission;
  isPreview:    boolean;
  isActivating: boolean;
  showRing:     boolean;
  onSelect:     (id: string) => void;
}

export default function MissionPlanet({ mission, isPreview, isActivating, showRing, onSelect }: MissionPlanetProps) {
  const [isHovered, setIsHovered] = useState(false);
  const reducedMotion = useReducedMotion() ?? false;
  const theme = PLANET_THEMES[mission.order] ?? FALLBACK;
  const isLit = isHovered || isPreview;

  const bobAnimation = reducedMotion
    ? {}
    : { y: [0, -8, 0] as number[] };

  const bobTransition = reducedMotion
    ? {}
    : { duration: 7, repeat: Infinity, ease: 'easeInOut' as const, delay: (mission.order - 1) * 2.5 };

  return (
    <div className="flex flex-col items-center" style={{ width: 'clamp(100px, 18vw, 160px)' }}>
      {/* Planet orb */}
      <motion.div
        animate={bobAnimation}
        transition={bobTransition}
        style={{ position: 'relative', width: '100%', aspectRatio: '1' }}
      >
        <motion.div
          className="rounded-full w-full h-full cursor-pointer relative"
          style={{
            background: `radial-gradient(circle at 32% 28%, ${theme.highlight} 0%, ${theme.mid} 42%, ${theme.core} 100%)`,
            boxShadow: `0 0 40px rgba(${theme.rgb}, 0.35), 0 0 80px rgba(${theme.rgb}, 0.15), inset -12px -10px 30px rgba(0,0,0,0.5)`,
            opacity: isActivating ? 0.55 : 1,
          }}
          animate={{ scale: isLit ? 1.15 : 1 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.28, ease: 'easeOut' }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => !isActivating && onSelect(mission.id)}
          role="button"
          tabIndex={0}
          aria-label={`Mission ${mission.order}: ${mission.title}`}
          onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !isActivating) { e.preventDefault(); onSelect(mission.id); } }}
        >
          {/* Orbital ring */}
          {showRing && theme.ring && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: '-18% -28%',
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.24)',
                transform: 'rotateX(72deg)',
                pointerEvents: 'none',
              }}
            />
          )}
        </motion.div>
      </motion.div>

      {/* Mission number label */}
      <p
        className="font-space text-[9px] tracking-[0.3em] uppercase mt-3"
        style={{ color: 'rgba(255,255,255,0.32)' }}
      >
        Mission {mission.order}
      </p>

      {/* Question + CTA reveal */}
      <AnimatePresence>
        {isLit && (
          <motion.div
            key="reveal"
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 4 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.22 }}
            className="flex flex-col items-center mt-2 text-center px-2"
          >
            <p
              className="text-white/85 text-[13px] leading-snug"
              style={{ maxWidth: '22ch', textWrap: 'balance' as never }}
            >
              {mission.title}
            </p>
            <p
              className="font-space text-[10px] tracking-[0.22em] uppercase mt-2"
              style={{ color: 'var(--color-teal)' }}
            >
              {isActivating ? 'Launching…' : '▸ Land here'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
