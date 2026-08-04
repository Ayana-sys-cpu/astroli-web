'use client';

/** Colour tiers every five questions deep — teal → purple → magenta → gold. */
const TIERS = ['#00F5D4', '#A855F7', '#FF3D9A', '#FFD700'];

/**
 * Going deeper becomes a visible score: one pip per question toward the next
 * tier, a colour upgrade every five, a small pulse on each milestone. Quiet
 * enough to ignore, satisfying enough to chase.
 */
export default function DepthMeter({ depth }: { depth: number }) {
  if (depth === 0) return null;

  const tier = Math.min(Math.floor((depth - 1) / 5), TIERS.length - 1);
  const colour = TIERS[tier];
  const withinTier = ((depth - 1) % 5) + 1;
  const milestone = depth % 5 === 0;

  return (
    <div
      className="ml-auto flex items-center gap-2"
      title={`You're ${depth} question${depth === 1 ? '' : 's'} deep`}
      aria-label={`Depth ${depth}`}
    >
      <div className={`flex items-center gap-1 ${milestone ? 'depth-pulse' : ''}`} aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="inline-block h-1.5 w-1.5 rounded-full transition-colors duration-500"
            style={{
              background: i < withinTier ? colour : 'transparent',
              border: `1px solid ${i < withinTier ? colour : 'var(--master-hairline)'}`,
            }}
          />
        ))}
      </div>
      <span className="text-[11px]" style={{ color: colour, fontFamily: 'var(--font-space)', fontWeight: 700 }}>
        Depth {depth}
      </span>

      <style>{`
        .depth-pulse { animation: depth-pop 0.9s ease-out 2; }
        @keyframes depth-pop {
          0%, 100% { transform: scale(1); }
          40% { transform: scale(1.35); }
        }
      `}</style>
    </div>
  );
}
