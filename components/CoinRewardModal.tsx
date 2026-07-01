'use client';
import { motion, AnimatePresence } from 'framer-motion';
import type { CoinRewardResult } from '@/hooks/useCoinReward';
import type { EventType } from '@/lib/coin-service';

const EVENT_CONFIG: Record<EventType, { title: string; subtitle: string }> = {
  goal_completion: {
    title:    'Goal Reached',
    subtitle: 'Keep exploring the universe.',
  },
  first_vote: {
    title:    'First Vote Cast!',
    subtitle: 'Your voice shapes the mission.',
  },
  mission_complete: {
    title:    'Mission Accomplished!',
    subtitle: 'Elite performance achieved.',
  },
  bonus_mission: {
    title:    'Bonus Mission Done!',
    subtitle: 'Your creativity earned extra coins.',
  },
};

export default function CoinRewardModal({
  reward,
  onDismiss,
}: {
  reward:    CoinRewardResult;
  onDismiss: () => void;
}) {
  const cfg      = EVENT_CONFIG[reward.eventType];
  const title    = reward.titleOverride    ?? cfg.title;
  const subtitle = reward.subtitleOverride ?? cfg.subtitle;

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
      }}>
        {/* Nebula blobs */}
        <div style={{
          position: 'absolute', width: '500px', height: '500px', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(138,92,245,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)', top: '10%', left: '15%',
        }} />
        <div style={{
          position: 'absolute', width: '500px', height: '500px', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(0,242,234,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)', bottom: '10%', right: '15%',
        }} />

        <style>{`
          @keyframes crm-spin-cw  { to { transform: rotate(360deg);  } }
          @keyframes crm-spin-ccw { to { transform: rotate(-360deg); } }
          @keyframes crm-pulse    { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
          .crm-ring-outer { animation: crm-spin-cw  10s linear infinite; }
          .crm-ring-inner { animation: crm-spin-ccw  7s linear infinite; }
          .crm-pulse      { animation: crm-pulse      2s ease-in-out infinite; }
          .crm-btn:hover  { box-shadow: 0 0 20px rgba(0,242,234,0.55); }
        `}</style>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1,   y: 0  }}
          exit={{    opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', damping: 22, stiffness: 220 }}
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
            onClick={onDismiss}
            style={{
              width: '100%', height: '48px', border: 'none', borderRadius: '12px',
              background: '#00f2ea', color: '#003735',
              fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', transition: 'box-shadow 0.2s',
            }}
          >
            <span>Claim Reward</span>
            <i className="ti ti-arrow-right" style={{ fontSize: '18px' }} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
