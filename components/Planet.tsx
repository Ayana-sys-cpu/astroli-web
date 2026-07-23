'use client';
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

// Planet orb shrinks fluidly on narrow screens (58px on desktop).
const PLANET_SIZE = 'clamp(46px, 12vw, 58px)';

export default function Planet({ id, name, shortTitle, number, planetQuestion, x, y, explored = false, goalsDiscovered = 0, totalGoals = 0, onClick, lang = 'en' }: PlanetProps) {
  const theme = THEMES[id] ?? FALLBACK;

  // No React hover state on purpose: a setState on mouseenter re-renders this
  // subtree mid-gesture and drops the click on touch (student had to tap twice).
  // The desktop hover preview is pure CSS (group-hover, lg only); the orb's
  // hover/tap feedback comes from framer's whileHover/whileTap, which don't
  // trigger a React re-render. A single tap therefore always navigates.
  return (
    <div
      className="group absolute"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
    >
      {/* ── Question tooltip — desktop hover preview only (CSS, never on touch) ── */}
      <div
        className="hidden lg:block absolute left-[calc(100%+18px)] top-1/2 -translate-y-1/2 rounded-xl p-5 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
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
      </div>

      {/* ── Planet ─────────────────────────────────────────────── */}
      <button
        onClick={() => onClick?.()}
        className="relative flex items-center justify-center cursor-pointer"
        style={{ width: `calc(${PLANET_SIZE} + 20px)`, height: `calc(${PLANET_SIZE} + 20px)` }}
        aria-label={shortTitle}
      >
        {/* Orbital ring — CSS spin (no JS gesture library that could eat the tap) */}
        <div
          className={`absolute rounded-full border pointer-events-none animate-[spin_18s_linear_infinite] ${explored ? '' : 'border-dashed lg:group-hover:border-solid'}`}
          style={{
            width: `calc(${PLANET_SIZE} + 20px)`,
            height: `calc(${PLANET_SIZE} + 20px)`,
            borderColor: `rgba(${theme.orbitRgb},${explored ? 0.75 : 0.5})`,
            borderStyle: explored ? 'dashed' : undefined,
          }}
        />

        {/* Planet body — CSS-only hover/tap feedback (no pointer-capturing lib) */}
        <div
          className="flex items-center justify-center rounded-full pointer-events-none transition-transform duration-150 lg:group-hover:scale-110 group-active:scale-95"
          style={{
            width: PLANET_SIZE,
            height: PLANET_SIZE,
            background: explored
              ? `radial-gradient(circle at 38% 32%, ${theme.core}, #000310)`
              : `radial-gradient(circle at 38% 32%, ${theme.core}aa, #00020a)`,
            border: `2px solid rgba(${theme.rgb},${explored ? 0.88 : 0.6})`,
            boxShadow: explored
              ? `0 0 22px rgba(${theme.rgb},0.55), inset 0 0 14px rgba(${theme.rgb},0.1)`
              : `0 0 14px rgba(${theme.rgb},0.35)`,
          }}
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
                  fill={`rgba(${theme.rgb},0.45)`}
                />
              ))}
            </svg>
          )}
        </div>

        {/* Planet name label */}
        <span
          className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.16em] whitespace-normal max-w-[110px] lg:max-w-none lg:whitespace-nowrap text-center leading-tight font-space uppercase"
          style={{
            color: explored ? `rgba(${theme.rgb},0.9)` : 'rgba(255,255,255,0.6)',
          }}
        >
          {shortTitle}
        </span>
      </button>
    </div>
  );
}
