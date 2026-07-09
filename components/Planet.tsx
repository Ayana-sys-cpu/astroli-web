'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t, type Lang } from '@/lib/i18n';

/* Per-planet color theme */
const THEMES: Record<string, { core: string; glow: string; rgb: string; orbitRgb: string }> = {
  'gutenberg-bible':  { core: '#130828', glow: '#8B00FF', rgb: '139,0,255',   orbitRgb: '139,0,255'  },
  'printing-press':   { core: '#001a10', glow: '#00F5D4', rgb: '0,245,212',   orbitRgb: '0,245,212'  },
  'press-public':     { core: '#1a0a00', glow: '#FF6B35', rgb: '255,107,53',  orbitRgb: '255,107,53' },
  'scriptures':       { core: '#00091a', glow: '#0099FF', rgb: '0,153,255',   orbitRgb: '0,153,255'  },
  'royal-decree':     { core: '#1a1000', glow: '#FFD600', rgb: '255,214,0',   orbitRgb: '255,214,0'  },
  'protest-pamphlet': { core: '#1a0010', glow: '#FF0080', rgb: '255,0,128',   orbitRgb: '255,0,128'  },
};
const FALLBACK = { core: '#0a0a14', glow: '#00F5D4', rgb: '0,245,212', orbitRgb: '0,245,212' };

interface PlanetProps {
  id: string;
  name: string;
  shortTitle: string;
  number: string;
  planetQuestion: string | null;
  x: number;
  y: number;
  explored?: boolean;
  goalsDiscovered?: number;
  totalGoals?: number;
  onClick?: () => void;
  lang?: Lang;
}

const PLANET_SIZE = 58;

export default function Planet({ id, name, shortTitle, number, planetQuestion, x, y, explored = false, goalsDiscovered = 0, totalGoals = 0, onClick, lang = 'en' }: PlanetProps) {
  const [hovered, setHovered] = useState(false);
  const theme = THEMES[id] ?? FALLBACK;

  return (
    <div
      className="absolute"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
    >
      {/* ── Hover tooltip ──────────────────────────────────────── */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="absolute left-[calc(100%+18px)] top-1/2 -translate-y-1/2 rounded-xl p-5 z-30"
            style={{
              width: 270,
              background: '#07070F',
              border: `1px solid rgba(${theme.rgb},0.25)`,
              boxShadow: `0 0 24px rgba(${theme.rgb},0.18)`,
            }}
          >
            <p
              className="text-[11px] tracking-[0.22em] font-space uppercase mb-2"
              style={{ color: `rgba(${theme.rgb},0.75)` }}
            >
              {t('planetLabel', lang)} {number}
            </p>
            {planetQuestion ? (
              <p className="text-[15px] font-inter leading-snug text-white/90">
                {planetQuestion}
              </p>
            ) : (
              <p className="text-[13px] font-inter text-white/40 italic">
                {t('clickToExplore', lang)}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              {explored ? (
                <>
                  {/* Teal dots — all filled */}
                  <div className="flex items-center gap-[3px]">
                    {Array.from({ length: Math.max(totalGoals, 1) }).map((_, i) => (
                      <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', display: 'inline-block', background: '#00C4CC' }} />
                    ))}
                  </div>
                  <span className="text-[11px] tracking-wider font-space uppercase" style={{ color: '#00C4CC' }}>
                    {t('exploredStatus', lang)} · {totalGoals}/{totalGoals}
                  </span>
                </>
              ) : goalsDiscovered > 0 && totalGoals > 0 ? (
                <>
                  {/* Amber dots — filled to ratio */}
                  <div className="flex items-center gap-[3px]">
                    {Array.from({ length: totalGoals }).map((_, i) => (
                      <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', display: 'inline-block',
                        background: i < goalsDiscovered ? '#F59E0B' : 'rgba(255,255,255,0.15)',
                        border: i < goalsDiscovered ? 'none' : '0.5px solid rgba(255,255,255,0.25)' }} />
                    ))}
                  </div>
                  <span className="text-[11px] tracking-wider font-space uppercase" style={{ color: '#F59E0B' }}>
                    {t('exploringHoverLabel', lang)} · {goalsDiscovered}/{totalGoals}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
                  <span className="text-[11px] tracking-wider font-space text-white/40 uppercase">
                    {t('unexploredStatus', lang)}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Planet ─────────────────────────────────────────────── */}
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex items-center justify-center cursor-pointer"
        style={{ width: PLANET_SIZE + 20, height: PLANET_SIZE + 20 }}
        aria-label={shortTitle}
      >
        {/* Orbital ring — dashed at rest, solid on hover */}
        <motion.div
          className="absolute rounded-full border pointer-events-none"
          style={{
            width: PLANET_SIZE + 20,
            height: PLANET_SIZE + 20,
            borderColor: `rgba(${theme.orbitRgb},${hovered || explored ? 0.75 : 0.5})`,
            borderStyle: hovered ? 'solid' : 'dashed',
            borderWidth: hovered ? '1.5px' : '1px',
            transition: 'border-color 0.25s, border-style 0.25s, border-width 0.25s',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        />

        {/* Planet body */}
        <motion.div
          className="flex items-center justify-center rounded-full"
          style={{
            width: PLANET_SIZE,
            height: PLANET_SIZE,
            background: explored
              ? `radial-gradient(circle at 38% 32%, ${theme.core}, #000310)`
              : `radial-gradient(circle at 38% 32%, ${theme.core}aa, #00020a)`,
            border: `2px solid rgba(${theme.rgb},${hovered || explored ? 0.88 : 0.6})`,
            boxShadow: explored
              ? `0 0 22px rgba(${theme.rgb},0.55), inset 0 0 14px rgba(${theme.rgb},0.1)`
              : hovered
              ? `0 0 22px rgba(${theme.rgb},0.55)`
              : `0 0 14px rgba(${theme.rgb},0.35)`,
            transition: 'box-shadow 0.25s, border-color 0.25s',
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', damping: 18, stiffness: 300 }}
        >
          {explored ? (
            <span style={{ color: theme.glow, fontSize: 18 }}>✓</span>
          ) : (
            /* Surface texture — minimal dot pattern */
            <svg viewBox="0 0 40 40" width={28} height={28} aria-hidden>
              {[
                [12, 14], [22, 10], [30, 18], [16, 26], [26, 28], [20, 20],
              ].map(([cx, cy], i) => (
                <circle
                  key={i}
                  cx={cx} cy={cy} r={1.2}
                  fill={`rgba(${theme.rgb},${hovered ? 0.65 : 0.45})`}
                />
              ))}
            </svg>
          )}
        </motion.div>

        {/* Planet name label */}
        <span
          className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.16em] whitespace-nowrap font-space uppercase transition-colors duration-200"
          style={{
            color: hovered || explored
              ? `rgba(${theme.rgb},0.9)`
              : 'rgba(255,255,255,0.6)',
          }}
        >
          {shortTitle}
        </span>
      </button>
    </div>
  );
}
