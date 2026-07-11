'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { t, type Lang } from '@/lib/i18n';
import { useCoinReward } from '@/hooks/useCoinReward';
import CoinBurst from '@/components/CoinBurst';
import { TermRow } from '@/components/TermRow';
import type { SummaryInsight } from '@/hooks/usePlanetVoice';
import type { MissionTerm } from '@/lib/orin-guide-types';

export interface NextPlanetInfo {
  id: string;
  label: string;
  title: string;
}

export interface MissionProgressInfo {
  completed: number;
  total: number;
  justCompletedIndex: number;
}

interface Props {
  award: { amount: number; newBalance: number };
  planetName: string;
  orinVideoUrl: string;
  insights: SummaryInsight[];
  introducedTerms: MissionTerm[];
  nextPlanet: NextPlanetInfo | null;
  missionProgress: MissionProgressInfo;
  language: Lang;
  classId?: string;
  onClose: () => void;
  // 'mission' — the planet just completed was the last one, finishing the whole
  // mission: Beat 1/3 texts celebrate the mission and Beat 3 routes to /home.
  variant?: 'planet' | 'mission';
}

type Beat = 1 | 2 | 3;
type ClaimState = 'idle' | 'claiming' | 'claimed';

// Colour tokens shared across beats
const C = {
  bg:    'rgba(0,0,0,0.97)',
  card:  'rgba(255,255,255,0.05)',
  bdr:   'rgba(255,255,255,0.09)',
  tp:    '#e2e8f0',
  ts:    '#8896a8',
  ac:    '#00d4d4',
  gold:  '#f0c040',
} as const;

const BEAT2_SIZE  = 160; // px — Orin in corner
const BEAT2_INSET = 60;  // px — margin from screen edge

function playChime() {
  try {
    const ctx = new AudioContext();
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.11;
      osc.start(start);
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc.stop(start + 0.2);
    });
  } catch {
    // audio not available — silent fallback
  }
}

export default function PlanetCelebrationOverlay({
  award, planetName, orinVideoUrl,
  insights, introducedTerms,
  nextPlanet, missionProgress,
  language, classId, onClose,
  variant = 'planet',
}: Props) {
  const router = useRouter();
  const { setBalance } = useCoinReward();

  const REDUCED = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
  const isRTL = language === 'he';

  const [beat, setBeat]             = useState<Beat>(1);
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [burstKey, setBurstKey]     = useState(0);
  const [burstFrom, setBurstFrom]   = useState<DOMRect | null>(null);
  const [burstTo,   setBurstTo]     = useState<DOMRect | null>(null);
  const [b3GlowReady, setB3GlowReady] = useState(false);

  const cardRef   = useRef<HTMLDivElement>(null);
  const cardB3Ref = useRef<HTMLDivElement>(null);
  const orinRef   = useRef<HTMLVideoElement>(null);

  // ── Orin position ──────────────────────────────────────────────────────────

  const placeOrinOnCard = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    const video = orinRef.current;
    const card  = ref.current;
    if (!video || !card) return;
    const w   = Math.min(400, window.innerWidth * 0.8);
    const rect = card.getBoundingClientRect();
    video.style.width  = `${w}px`;
    video.style.height = `${w}px`;
    video.style.left   = `${rect.left + rect.width / 2}px`;
    // Centre of Orin sits 40% of his height above the card top
    video.style.top    = `${rect.top - w * 0.40 + w / 2}px`;
  }, []);

  const setOrinCorner = useCallback(() => {
    const video = orinRef.current;
    if (!video) return;
    const size   = BEAT2_SIZE;
    const centre = size / 2 + BEAT2_INSET;
    video.style.width  = `${size}px`;
    video.style.height = `${size}px`;
    video.style.left   = isRTL
      ? `${window.innerWidth - centre}px`
      : `${centre}px`;
    video.style.top    = `${window.innerHeight - centre}px`;
  }, [isRTL]);

  // Place Orin relative to current beat's card
  useEffect(() => {
    if (beat === 1) {
      placeOrinOnCard(cardRef);
    } else if (beat === 2) {
      setOrinCorner();
    } else if (beat === 3) {
      // Give the card a frame to paint before reading its rect
      requestAnimationFrame(() => placeOrinOnCard(cardB3Ref));
    }
  }, [beat, placeOrinOnCard, setOrinCorner]);

  // Reposition on resize
  useEffect(() => {
    function onResize() {
      if (beat === 1) placeOrinOnCard(cardRef);
      else if (beat === 2) setOrinCorner();
      else if (beat === 3) placeOrinOnCard(cardB3Ref);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [beat, placeOrinOnCard, setOrinCorner]);

  // Glow animation triggers when Beat 3 card mounts
  useEffect(() => {
    if (beat === 3) {
      const id = setTimeout(() => setB3GlowReady(true), 300);
      return () => clearTimeout(id);
    }
  }, [beat]);

  // ── Claim ──────────────────────────────────────────────────────────────────

  function handleClaim() {
    if (claimState !== 'idle') return;
    setClaimState('claiming');

    if (REDUCED) {
      setBalance(award.newBalance);
      setClaimState('claimed');
      return;
    }

    playChime();
    const card    = cardRef.current;
    const pillEl  = document.getElementById('coin-balance-pill');
    if (card && pillEl) {
      setBurstFrom(card.getBoundingClientRect());
      setBurstTo(pillEl.getBoundingClientRect());
      setBurstKey(k => k + 1);
    } else {
      // Fallback — no coin counter visible
      setBalance(award.newBalance);
      setClaimState('claimed');
    }
  }

  function handleBurstArrive() {
    setBalance(award.newBalance);
  }
  function handleBurstComplete() {
    setClaimState('claimed');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function handleExploreNext() {
    if (!nextPlanet) return;
    onClose();
    router.push(`/landscape/${nextPlanet.id}${classId ? `?classId=${classId}` : ''}`);
  }

  function handleBackToMap() {
    onClose();
    router.push(classId ? `/landscape?classId=${classId}` : '/landscape');
  }

  function handleBackToHome() {
    onClose();
    router.push('/home');
  }

  // ── Progress bar ───────────────────────────────────────────────────────────

  const { completed, total } = missionProgress;
  const segments = Array.from({ length: total }, (_, i) => {
    if (i < completed - 1) return 'filled';
    if (i === completed - 1) return 'fresh';
    return 'empty';
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: C.bg,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        overflowY: 'auto',
      }}
    >
      {/* Orin video — single element, travels between beats */}
      <video
        ref={orinRef}
        src={orinVideoUrl}
        autoPlay loop muted playsInline
        style={{
          position: 'fixed',
          zIndex: 510,
          transform: 'translate(-50%, -50%)',
          objectFit: 'contain',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
          // Initial position — JS overrides after mount
          left: '50%',
          top: '30%',
          width: 'min(400px, 80vw)',
          height: 'min(400px, 80vw)',
          transition: REDUCED ? 'none'
            : 'left 0.75s cubic-bezier(0.4,0,0.2,1), top 0.75s cubic-bezier(0.4,0,0.2,1), width 0.75s cubic-bezier(0.4,0,0.2,1), height 0.75s cubic-bezier(0.4,0,0.2,1)',
        }}
      />

      {/* Skip button — always visible */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: 20, right: isRTL ? 'auto' : 20, left: isRTL ? 20 : 'auto',
          zIndex: 520,
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          color: C.ts,
          fontSize: 12, fontWeight: 600,
          padding: '6px 12px',
          cursor: 'pointer',
          letterSpacing: '0.06em',
        }}
      >
        {t('skipCelebration', language)}
      </button>

      {/* CoinBurst animation layer */}
      {burstFrom && burstTo && (
        <CoinBurst
          key={burstKey}
          from={burstFrom}
          to={burstTo}
          onArrive={handleBurstArrive}
          onComplete={handleBurstComplete}
        />
      )}

      {/* ── Beat 1: Coin Claim ────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {beat === 1 && (
          <motion.div
            key="beat1"
            initial={{ opacity: REDUCED ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: REDUCED ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', minHeight: '100vh',
              width: '100%', padding: '0 24px',
            }}
          >
            <div
              ref={cardRef}
              style={{
                width: '100%', maxWidth: 360,
                marginTop: '15vh',
                background: C.card,
                border: `1px solid ${C.bdr}`,
                borderRadius: 22,
                padding: '32px 28px',
                textAlign: 'center',
              }}
            >
              {/* Planet name — or mission-complete headline for the mission variant */}
              <p style={{
                fontSize: variant === 'mission' ? 15 : 11,
                color: variant === 'mission' ? C.gold : C.ts,
                fontWeight: variant === 'mission' ? 800 : 400,
                letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 12px',
              }}>
                {variant === 'mission' ? t('missionComplete', language) : planetName}
              </p>

              {/* Coins */}
              <p style={{ fontSize: 48, fontWeight: 800, color: C.gold, margin: '0 0 4px', lineHeight: 1 }}>
                +{award.amount}
              </p>
              <p style={{ fontSize: 13, color: C.ts, margin: '0 0 28px' }}>
                {t('coinsEarned', language)}
              </p>

              {/* CTA */}
              {claimState === 'idle' && (
                <button
                  onClick={handleClaim}
                  style={{
                    width: '100%', padding: '15px 20px', borderRadius: 14,
                    background: C.ac, border: 'none', cursor: 'pointer',
                    color: '#000', fontSize: 15, fontWeight: 800,
                  }}
                >
                  {t('claimReward', language)}
                </button>
              )}
              {claimState === 'claiming' && (
                <button
                  disabled
                  style={{
                    width: '100%', padding: '15px 20px', borderRadius: 14,
                    background: 'rgba(0,212,212,0.4)', border: 'none',
                    color: 'rgba(0,0,0,0.5)', fontSize: 15, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000',
                    display: 'inline-block', animation: 'spin 0.7s linear infinite',
                  }} />
                  {t('claiming', language)}
                </button>
              )}
              {claimState === 'claimed' && (
                <button
                  onClick={() => setBeat(2)}
                  style={{
                    width: '100%', padding: '15px 20px', borderRadius: 14,
                    background: C.ac, border: 'none', cursor: 'pointer',
                    color: '#000', fontSize: 15, fontWeight: 800,
                  }}
                >
                  {t('whatDidILearn', language)} →
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Beat 2: What I Learned ────────────────────────────────────────── */}
        {beat === 2 && (
          <motion.div
            key="beat2"
            initial={{ opacity: REDUCED ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: REDUCED ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{
              width: '100%', maxWidth: 680,
              display: 'flex', flexDirection: 'column', flex: 1,
              padding: '0 24px',
            }}
          >
            {/* Header */}
            <div style={{ padding: '36px 0 0' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.ac, margin: '0 0 4px' }}>
                {t('hereWhatICaught', language)}
              </p>
              <p style={{ fontSize: 11, color: C.ts, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                {planetName}
              </p>
            </div>

            {/* Insight cards */}
            <div style={{ padding: '24px 0 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {insights.length === 0 ? (
                <p style={{ fontSize: 14, color: C.ts, padding: '20px 0' }}>
                  {t('noInsightsYet', language)}
                </p>
              ) : insights.map((insight, idx) => (
                <motion.div
                  key={insight.goalSlug || idx}
                  initial={{ opacity: REDUCED ? 1 : 0, y: REDUCED ? 0 : 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: REDUCED ? 0 : 0.1 + idx * 0.12, duration: 0.3, ease: 'easeOut' }}
                  style={{
                    background: C.card,
                    border: `1px solid ${C.bdr}`,
                    borderRadius: 14,
                    padding: '16px 20px',
                  }}
                >
                  {insight.termName && (
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.ac, margin: '0 0 6px', letterSpacing: '0.06em' }}>
                      {insight.termName}
                    </p>
                  )}
                  <p style={{ fontSize: 14, color: C.tp, lineHeight: 1.7, margin: 0 }}>
                    {insight.insightText}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Introduced terms */}
            {introducedTerms.length > 0 && (
              <div style={{ padding: '20px 0 0' }}>
                <p style={{
                  fontSize: 10, fontWeight: 700, color: C.ts,
                  textTransform: 'uppercase', letterSpacing: '0.14em',
                  margin: '0 0 10px',
                }}>
                  {t('termsEncountered', language)}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {introducedTerms.map((term, i) => <TermRow key={i} term={term} />)}
                </div>
              </div>
            )}

            {/* CTA */}
            <div style={{ padding: '28px 0 40px' }}>
              <button
                onClick={() => setBeat(3)}
                style={{
                  width: '100%', padding: '15px 20px', borderRadius: 14,
                  background: C.ac, border: 'none', cursor: 'pointer',
                  color: '#000', fontSize: 15, fontWeight: 800,
                }}
              >
                {t('whereNext', language)} →
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Beat 3: Where Next ────────────────────────────────────────────── */}
        {beat === 3 && (
          <motion.div
            key="beat3"
            initial={{ opacity: REDUCED ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: REDUCED ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', minHeight: '100vh',
              width: '100%', padding: '0 24px',
            }}
          >
            <div style={{ width: '100%', maxWidth: 360, marginTop: '18vh' }}>
              {/* Progress bar */}
              {total > 0 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
                  {segments.map((kind, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1, height: 6, borderRadius: 3,
                        background: kind === 'empty'
                          ? 'rgba(255,255,255,0.12)'
                          : kind === 'filled'
                            ? 'rgba(0,212,212,0.45)'
                            : 'transparent',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      {kind === 'fresh' && (
                        <div
                          style={{
                            position: 'absolute', inset: 0,
                            background: C.ac,
                            transformOrigin: isRTL ? 'right' : 'left',
                            animation: b3GlowReady && !REDUCED
                              ? 'segFill 0.6s ease-out forwards, segGlow 1s ease-out 0.6s forwards'
                              : 'none',
                            transform: b3GlowReady ? undefined : 'scaleX(0)',
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Mission complete state */}
              {variant === 'mission' || !nextPlanet ? (
                <div
                  ref={cardB3Ref}
                  style={{
                    background: C.card, border: `1px solid ${C.bdr}`,
                    borderRadius: 22, padding: '32px 28px', textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: 22, fontWeight: 800, color: variant === 'mission' ? C.gold : C.tp, margin: '0 0 8px' }}>
                    {t('missionComplete', language)}
                  </p>
                  <p style={{ fontSize: 13, color: C.ts, margin: '0 0 24px' }}>
                    {variant === 'mission'
                      ? t('entireMissionComplete', language)
                      : t('uncoveredEverySecret', language)}
                  </p>
                  {variant === 'mission' ? (
                    <>
                      <button
                        onClick={handleBackToHome}
                        style={{
                          width: '100%', padding: '15px 20px', borderRadius: 14,
                          background: C.ac, border: 'none', cursor: 'pointer',
                          color: '#000', fontSize: 15, fontWeight: 800,
                          marginBottom: 10,
                        }}
                      >
                        {t('chooseNextMission', language)}
                      </button>
                      <button
                        onClick={handleBackToMap}
                        style={{
                          width: '100%', padding: '12px 20px', borderRadius: 14,
                          background: 'transparent',
                          border: `1px solid ${C.bdr}`,
                          cursor: 'pointer',
                          color: C.ts, fontSize: 14, fontWeight: 600,
                        }}
                      >
                        {t('celebrationBackToMap', language)}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleBackToMap}
                      style={{
                        width: '100%', padding: '15px 20px', borderRadius: 14,
                        background: C.ac, border: 'none', cursor: 'pointer',
                        color: '#000', fontSize: 15, fontWeight: 800,
                      }}
                    >
                      {t('celebrationBackToMap', language)}
                    </button>
                  )}
                </div>
              ) : (
                <div
                  ref={cardB3Ref}
                  style={{
                    background: C.card, border: `1px solid ${C.bdr}`,
                    borderRadius: 22, padding: '32px 28px', textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: 11, color: C.ts, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                    {t('whereNext', language)}
                  </p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: C.tp, margin: '0 0 24px' }}>
                    {nextPlanet.label}
                  </p>

                  <button
                    onClick={handleExploreNext}
                    style={{
                      width: '100%', padding: '15px 20px', borderRadius: 14,
                      background: C.ac, border: 'none', cursor: 'pointer',
                      color: '#000', fontSize: 15, fontWeight: 800,
                      marginBottom: 10,
                    }}
                  >
                    {t('exploreNext', language).replace('{name}', nextPlanet.label)}
                  </button>

                  <button
                    onClick={handleBackToMap}
                    style={{
                      width: '100%', padding: '12px 20px', borderRadius: 14,
                      background: 'transparent',
                      border: `1px solid ${C.bdr}`,
                      cursor: 'pointer',
                      color: C.ts, fontSize: 14, fontWeight: 600,
                    }}
                  >
                    {t('celebrationBackToMap', language)}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyframes for progress bar and spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes segFill {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes segGlow {
          0%   { box-shadow: 0 0 8px 2px rgba(0,212,212,0.7); }
          100% { box-shadow: none; }
        }
      `}</style>
    </div>
  );
}
