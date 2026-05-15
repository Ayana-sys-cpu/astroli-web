'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  number: string;
  question: string;
  x: number;
  y: number;
  explored?: boolean;
  onClick?: () => void;
}

const PLANET_SIZE = 58;

export default function Planet({ id, name, number, question, x, y, explored = false, onClick }: PlanetProps) {
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
            className="absolute left-[calc(100%+18px)] top-1/2 -translate-y-1/2 rounded-xl p-3.5 z-30"
            style={{
              width: 220,
              background: '#07070F',
              border: `1px solid rgba(${theme.rgb},0.25)`,
              boxShadow: `0 0 20px rgba(${theme.rgb},0.15)`,
            }}
          >
            <p
              className="text-[8px] tracking-[0.22em] font-space uppercase mb-1.5"
              style={{ color: `rgba(${theme.rgb},0.7)` }}
            >
              PLANET {number} · {name.toUpperCase()}
            </p>
            <p className="text-[13px] font-caveat leading-snug italic text-white/85">
              "{question}"
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <div
                className="w-1 h-1 rounded-full"
                style={{ background: theme.glow, boxShadow: `0 0 4px ${theme.glow}` }}
              />
              <span className="text-[8px] tracking-wider font-space text-white/25 uppercase">
                {explored ? 'EXPLORED' : 'UNEXPLORED'}
              </span>
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
        title={name}
        aria-label={name}
      >
        {/* Orbital ring */}
        <motion.div
          className="absolute rounded-full border pointer-events-none"
          style={{
            width: PLANET_SIZE + 20,
            height: PLANET_SIZE + 20,
            borderColor: `rgba(${theme.orbitRgb},${hovered || explored ? 0.35 : 0.14})`,
            borderStyle: 'dashed',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        />

        {/* Second orbital ring (counter-rotation) */}
        {(explored || hovered) && (
          <motion.div
            className="absolute rounded-full border pointer-events-none"
            style={{
              width: PLANET_SIZE + 8,
              height: PLANET_SIZE + 8,
              borderColor: `rgba(${theme.orbitRgb},0.2)`,
            }}
            initial={{ rotate: 0, opacity: 0 }}
            animate={{ rotate: -360, opacity: 1 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {/* Planet body */}
        <motion.div
          className="flex items-center justify-center rounded-full"
          style={{
            width: PLANET_SIZE,
            height: PLANET_SIZE,
            background: explored
              ? `radial-gradient(circle at 38% 32%, ${theme.core}, #000310)`
              : `radial-gradient(circle at 38% 32%, ${theme.core}aa, #00020a)`,
            border: `2px solid rgba(${theme.rgb},${hovered || explored ? 0.75 : 0.3})`,
            boxShadow: explored
              ? `0 0 22px rgba(${theme.rgb},0.55), inset 0 0 14px rgba(${theme.rgb},0.1)`
              : hovered
              ? `0 0 16px rgba(${theme.rgb},0.4)`
              : `0 0 8px rgba(${theme.rgb},0.12)`,
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
                  fill={`rgba(${theme.rgb},${hovered ? 0.5 : 0.2})`}
                />
              ))}
            </svg>
          )}
        </motion.div>

        {/* Planet name label */}
        <span
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] tracking-[0.16em] whitespace-nowrap font-space uppercase transition-colors duration-200"
          style={{
            color: hovered || explored
              ? `rgba(${theme.rgb},0.8)`
              : 'rgba(255,255,255,0.28)',
          }}
        >
          {name}
        </span>
      </button>
    </div>
  );
}
