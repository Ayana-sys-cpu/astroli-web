'use client';
import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CoinRewardResult } from '@/hooks/useCoinReward';
import type { EventType } from '@/lib/coin-service';

// Fixed (non-random) scatter positions for the stardust motes that drift in from
// the edges of the screen and coalesce toward the card as it materializes.
// Kept as a static array (not Math.random) so server/client markup always matches.
// dx/dy point each mote toward viewport center (50%,50%) so the whole field
// visibly converges on the card rather than drifting in one uniform direction.
const DUST_MOTES = [
  { left: '8%',  top: '18%', size: 3, delay: 0.000, hue: '#8a5cf5', dx: '25vw',  dy: '19vh'  },
  { left: '22%', top: '72%', size: 2, delay: 0.040, hue: '#00f2ea', dx: '17vw',  dy: '-13vh' },
  { left: '15%', top: '45%', size: 4, delay: 0.020, hue: '#c0a7ff', dx: '21vw',  dy: '3vh'   },
  { left: '35%', top: '12%', size: 2, delay: 0.070, hue: '#8a5cf5', dx: '9vw',   dy: '23vh'  },
  { left: '5%',  top: '85%', size: 3, delay: 0.050, hue: '#00f2ea', dx: '27vw',  dy: '-21vh' },
  { left: '48%', top: '90%', size: 2, delay: 0.090, hue: '#c0a7ff', dx: '1vw',   dy: '-24vh' },
  { left: '62%', top: '10%', size: 3, delay: 0.030, hue: '#8a5cf5', dx: '-7vw',  dy: '24vh'  },
  { left: '78%', top: '30%', size: 4, delay: 0.060, hue: '#00f2ea', dx: '-17vw', dy: '12vh'  },
  { left: '90%', top: '65%', size: 2, delay: 0.010, hue: '#c0a7ff', dx: '-24vw', dy: '-9vh'  },
  { left: '85%', top: '85%', size: 3, delay: 0.080, hue: '#8a5cf5', dx: '-21vw', dy: '-21vh' },
  { left: '70%', top: '92%', size: 2, delay: 0.100, hue: '#00f2ea', dx: '-12vw', dy: '-25vh' },
  { left: '92%', top: '15%', size: 3, delay: 0.045, hue: '#c0a7ff', dx: '-25vw', dy: '21vh'  },
  { left: '30%', top: '55%', size: 2, delay: 0.065, hue: '#8a5cf5', dx: '12vw',  dy: '-3vh'  },
  { left: '55%', top: '25%', size: 3, delay: 0.020, hue: '#00f2ea', dx: '-3vw',  dy: '15vh'  },
  { left: '12%', top: '60%', size: 2, delay: 0.085, hue: '#c0a7ff', dx: '23vw',  dy: '-6vh'  },
  { left: '68%', top: '55%', size: 4, delay: 0.035, hue: '#8a5cf5', dx: '-11vw', dy: '-3vh'  },
  { left: '40%', top: '80%', size: 2, delay: 0.075, hue: '#00f2ea', dx: '6vw',   dy: '-18vh' },
  { left: '80%', top: '48%', size: 3, delay: 0.055, hue: '#c0a7ff', dx: '-18vw', dy: '1vh'   },
];

// Card entrance timing, shared with the backdrop below so the dim can be
// sequenced to start only once the card has finished centering.
const CARD_ENTRANCE_DELAY_S = 0.35;
const CARD_ENTRANCE_DURATION_S = 0.85;
// The full-screen dim + blur is deliberately held back until the card lands:
// the chat underneath — including the utterance that earned this reward — stays
// readable for the whole entrance flight instead of vanishing on mount.
const BACKDROP_DIM_DELAY_S = CARD_ENTRANCE_DELAY_S + CARD_ENTRANCE_DURATION_S;
const BACKDROP_DIM_DURATION_S = 0.8;

const EVENT_CONFIG: Record<EventType, { title: string; subtitle: string }> = {
  goal_completion: {
    title:    'Goal Reached',
    subtitle: 'Keep exploring the universe.',
  },
  first_vote: {
    title:    'First Vote Cast!',
    subtitle: 'Your voice shapes the mission.',
  },
  planet_complete: {
    title:    'Planet Explored!',
    subtitle: "You've uncovered every secret on this planet.",
  },
  mission_complete: {
    title:    'Mission Accomplished!',
    subtitle: 'Every planet on this mission is explored.',
  },
  bonus_mission: {
    title:    'Bonus Mission Done!',
    subtitle: 'Your creativity earned extra coins.',
  },
};

export default function CoinRewardModal({
  reward,
  onClaim,
  claiming,
}: {
  reward:   CoinRewardResult;
  onClaim:  (cardRect: DOMRect) => void;
  claiming: boolean;
}) {
  const cfg      = EVENT_CONFIG[reward.eventType];
  const title    = reward.titleOverride    ?? cfg.title;
  const subtitle = reward.subtitleOverride ?? cfg.subtitle;
  const cardRef  = useRef<HTMLDivElement>(null);

  function handleClaim() {
    if (claiming || !cardRef.current) return;
    onClaim(cardRef.current.getBoundingClientRect());
  }

  // The card is centered via flexbox, so its resting transform is (0,0). To make
  // it visibly emerge from the chat panel — the source of the message + bot
  // acknowledgment that caused this reward — its *entrance* starts translated to
  // that panel's on-screen position instead of appearing at rest in the center.
  // No sourceRect (e.g. panel unmounted, or a caller that doesn't supply one) —
  // falls back to the original center-materialize entrance.
  const sourceOffset = (() => {
    if (!reward.sourceRect || typeof window === 'undefined') return null;
    const r = reward.sourceRect;
    return {
      x: (r.left + r.width / 2)  - window.innerWidth  / 2,
      y: (r.top  + r.height / 2) - window.innerHeight / 2,
    };
  })();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: claiming ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: claiming ? 0.35 : 0.6, ease: 'easeOut' }}
        style={{
          position: 'fixed', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, overflow: 'hidden',
          // Claiming lifts the overlay immediately so the page underneath is
          // interactive again while the coin-burst celebration keeps playing.
          pointerEvents: claiming ? 'none' : 'auto',
        }}>
        {/* Dim + blur backdrop, sequenced to fade in only after the card has
            centered — the chat (and the utterance that triggered this reward)
            stays readable during the card's entrance flight. The ambient nebula
            blobs and fog live inside it so the whole scene dims as one. */}
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(6px)' }}
          transition={{ delay: BACKDROP_DIM_DELAY_S, duration: BACKDROP_DIM_DURATION_S, ease: 'easeOut' }}
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 50% 50%, rgba(84,23,190,0.30) 0%, rgba(9,6,20,0.90) 75%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {/* Nebula blobs */}
          <div style={{
            position: 'absolute', width: '500px', height: '500px', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(138,92,245,0.14) 0%, transparent 70%)',
            filter: 'blur(40px)', top: '10%', left: '15%',
          }} />
          <div style={{
            position: 'absolute', width: '500px', height: '500px', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(0,242,234,0.09) 0%, transparent 70%)',
            filter: 'blur(40px)', bottom: '10%', right: '15%',
          }} />
          <div className="crm-fog" style={{
            position: 'absolute', width: '700px', height: '700px', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(138,92,245,0.10) 0%, transparent 65%)',
            filter: 'blur(60px)',
          }} />
        </motion.div>

        {/* Stardust motes — drift in from the edges and coalesce toward the card,
            giving the reward a moment to "materialize" instead of snapping in. */}
        {DUST_MOTES.map((mote, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0.9, 0], x: mote.dx, y: mote.dy, scale: [0.4, 1, 1, 0.6] }}
            transition={{ duration: 1.5, delay: mote.delay, ease: 'easeIn', times: [0, 0.35, 0.75, 1] }}
            style={{
              position: 'absolute', left: mote.left, top: mote.top,
              width: mote.size, height: mote.size, borderRadius: '50%',
              background: mote.hue, boxShadow: `0 0 ${mote.size * 3}px ${mote.hue}`,
              pointerEvents: 'none',
            }}
          />
        ))}

        <style>{`
          @keyframes crm-spin-cw  { to { transform: rotate(360deg);  } }
          @keyframes crm-spin-ccw { to { transform: rotate(-360deg); } }
          @keyframes crm-pulse    { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
          @keyframes crm-fog-drift {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50%      { transform: translate(2%, -3%) scale(1.06); }
          }
          .crm-ring-outer { animation: crm-spin-cw  10s linear infinite; }
          .crm-ring-inner { animation: crm-spin-ccw  7s linear infinite; }
          .crm-pulse      { animation: crm-pulse      2s ease-in-out infinite; }
          .crm-btn:hover  { box-shadow: 0 0 20px rgba(0,242,234,0.55); }
          .crm-fog        { animation: crm-fog-drift 6s ease-in-out infinite; }
        `}</style>

        <motion.div
          ref={cardRef}
          initial={
            sourceOffset
              ? { opacity: 0, scale: 0.2,  x: sourceOffset.x, y: sourceOffset.y, filter: 'blur(12px)' }
              : { opacity: 0, scale: 0.55, x: 0,               y: 20,            filter: 'blur(18px)' }
          }
          animate={
            claiming
              ? { opacity: 0, scale: 0.85, y: 20, filter: 'blur(4px)' }
              : { opacity: 1, scale: 1,    x: 0,  y: 0, filter: 'blur(0px)' }
          }
          exit={{ opacity: 0, scale: 0.96, y: 12, filter: 'blur(8px)' }}
          transition={
            claiming
              ? { duration: 0.35, ease: 'easeOut' }
              : { delay: CARD_ENTRANCE_DELAY_S, duration: CARD_ENTRANCE_DURATION_S, ease: [0.16, 1, 0.3, 1] }
          }
          style={{
            position: 'relative',
            width: '360px',
            background: 'rgba(26,29,46,0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            border: '1px solid rgba(138,92,245,0.25)',
            boxShadow: '0 0 40px rgba(0,0,0,0.5)',
            padding: '32px 28px 28px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center', gap: '20px',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '5px 14px', borderRadius: '9999px',
              background: 'rgba(49,53,60,0.5)', border: '1px solid rgba(58,74,72,0.35)',
            }}>
              <div className="crm-pulse" style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#00f2ea', boxShadow: '0 0 8px #00f2ea',
              }} />
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em',
                color: '#b9cac8',
              }}>
                ACHIEVEMENT UNLOCKED
              </span>
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: '34px', fontWeight: 700,
              lineHeight: 1.1, letterSpacing: '-0.02em',
              color: '#29fcf3',
              textShadow: '0 0 10px rgba(207,255,251,0.3)',
              margin: 0,
            }}>
              {title}
            </h1>

            <p style={{
              fontFamily: 'Hanken Grotesk, sans-serif',
              fontSize: '15px', color: 'rgba(185,202,200,0.8)',
              margin: 0,
            }}>
              {subtitle}
            </p>
          </div>

          {/* Orbit graphic */}
          <div style={{
            position: 'relative', width: '160px', height: '160px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Outer ring */}
            <div className="crm-ring-outer" style={{
              position: 'absolute', inset: 0,
              border: '1px dashed rgba(0,242,234,0.3)', borderRadius: '50%',
            }}>
              <div style={{
                position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)',
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#00f2ea', boxShadow: '0 0 10px #00f2ea',
              }} />
            </div>
            {/* Inner ring */}
            <div className="crm-ring-inner" style={{
              position: 'absolute', inset: '22px',
              border: '1px dashed rgba(0,242,234,0.15)', borderRadius: '50%',
            }}>
              <div style={{
                position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)',
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#00ddd6', boxShadow: '0 0 8px #00ddd6',
              }} />
            </div>
            {/* Glow sphere */}
            <div style={{
              width: '88px', height: '88px', borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #00f2ea, #006a66)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(0,242,234,0.4), inset 0 0 15px rgba(255,255,255,0.25)',
            }}>
              <i className="ti ti-check" style={{ fontSize: '36px', color: '#003735', fontWeight: 600 }} />
            </div>
          </div>

          {/* Coin reward row */}
          <div style={{ width: '100%' }}>
            <div style={{
              height: '1px', marginBottom: '16px',
              background: 'linear-gradient(to right, transparent, rgba(58,74,72,0.4), transparent)',
            }} />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px',
              padding: '14px 28px', borderRadius: '9999px',
              background: 'rgba(84,23,190,0.1)', border: '1px solid rgba(84,23,190,0.2)',
            }}>
              <i className="ti ti-star-filled" style={{ fontSize: '26px', color: '#D4A017' }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: '30px', fontWeight: 600,
                  color: '#c0a7ff',
                }}>
                  +{reward.amount}
                </span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em',
                  color: '#849492',
                }}>
                  COINS
                </span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            className="crm-btn"
            onClick={handleClaim}
            disabled={claiming}
            style={{
              width: '100%', height: '48px', border: 'none', borderRadius: '12px',
              background: '#00f2ea', color: '#003735',
              fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 600,
              cursor: claiming ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', transition: 'box-shadow 0.2s', opacity: claiming ? 0.7 : 1,
            }}
          >
            <span>Claim Reward</span>
            <i className="ti ti-arrow-right" style={{ fontSize: '18px' }} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
