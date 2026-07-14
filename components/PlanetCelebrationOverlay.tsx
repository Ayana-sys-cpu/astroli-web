'use client';
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { t, type Lang } from '@/lib/i18n';
import { useCoinReward } from '@/hooks/useCoinReward';
import type { SummaryInsight } from '@/hooks/usePlanetVoice';
import type { MissionTerm } from '@/lib/orin-guide-types';

export interface NextPlanetInfo {
  id: string;
  label: string;
  title: string;
  /** One-line teaser shown on the Beat 3 destination card. Falls back to `title`. */
  tease?: string;
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
  /** On-screen box of the element the overlay should fly out of (the chat panel),
   *  mirroring the goal-reward popup's entrance. Omit for the center-materialize fallback. */
  sourceRect?: DOMRect;
}

type Beat = 1 | 2 | 3;
type ClaimState = 'claim' | 'busy' | 'learn';

// Star field — fixed seed so it doesn't reshuffle on re-render.
const STAR_PTS: Array<[number, number, number, number, number, number]> = [
  [8, 18, 2, 0, 4, 0.35], [22, 72, 1.5, 0.04, 3.5, 0.25], [15, 45, 2.5, 0.02, 4.5, 0.3],
  [35, 12, 1, 0.07, 3, 0.2], [5, 85, 2, 0.05, 4, 0.4], [48, 90, 1.5, 0.09, 5, 0.3],
  [62, 10, 2, 0.03, 3.5, 0.35], [78, 30, 2.5, 0.06, 4, 0.25], [90, 65, 1, 0.01, 3, 0.2],
  [85, 85, 2, 0.08, 4.5, 0.3], [70, 92, 1.5, 0.1, 5, 0.25], [92, 15, 2, 0.045, 4, 0.3],
  [30, 55, 1, 0.065, 3, 0.2], [55, 25, 2, 0.02, 4.5, 0.35], [12, 60, 1.5, 0.085, 3.5, 0.25],
  [68, 55, 2.5, 0.035, 5, 0.4], [40, 80, 1, 0.075, 3, 0.2], [80, 48, 2, 0.055, 4, 0.3],
  [50, 35, 1.5, 0.015, 3.5, 0.25], [25, 10, 1, 0.095, 4, 0.2], [60, 70, 2, 0.025, 5, 0.35],
];

const MOTES = [
  { left: '8%',  top: '18%', size: 3, color: '#8a5cf5', dl: '0s',   dx: '25vw',  dy: '19vh' },
  { left: '22%', top: '72%', size: 2, color: '#00f2ea', dl: '.04s', dx: '17vw',  dy: '-13vh' },
  { left: '62%', top: '10%', size: 3, color: '#8a5cf5', dl: '.03s', dx: '-7vw',  dy: '24vh' },
  { left: '78%', top: '30%', size: 4, color: '#00f2ea', dl: '.06s', dx: '-17vw', dy: '12vh' },
  { left: '90%', top: '65%', size: 2, color: '#c0a7ff', dl: '.01s', dx: '-24vw', dy: '-9vh' },
  { left: '85%', top: '85%', size: 3, color: '#8a5cf5', dl: '.08s', dx: '-21vw', dy: '-21vh' },
];

export default function PlanetCelebrationOverlay({
  award, planetName, orinVideoUrl,
  insights, introducedTerms,
  nextPlanet, missionProgress,
  language, classId, onClose,
  variant = 'planet',
  sourceRect,
}: Props) {
  const router = useRouter();
  const { setBalance } = useCoinReward();

  const REDUCED = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
  const isRTL = language === 'he';
  // When the chat panel's box is supplied, Beat 1 flies out of it (goal-reward
  // entrance) instead of materializing at screen centre.
  const srcEntry = !!sourceRect && !REDUCED;

  const [beat, setBeat]         = useState<Beat>(1);
  const [claimState, setClaim]  = useState<ClaimState>('claim');
  const [coinCount, setCoinCount] = useState(award.amount); // the "+70" on the card, counts down
  const [claimed, setClaimed]   = useState(false);
  const preBalance = Math.max(0, award.newBalance - award.amount);
  const [pillBalance, setPillBalance] = useState(preBalance);
  const [pillPulse, setPillPulse] = useState(false);
  const [soundOn, setSoundOn]   = useState(true);

  const rootRef   = useRef<HTMLDivElement>(null);
  const orinRef   = useRef<HTMLVideoElement>(null);
  const cardRef   = useRef<HTMLDivElement>(null);
  const pillRef   = useRef<HTMLDivElement>(null);
  const coinCountRef = useRef<HTMLSpanElement>(null);
  const confettiRef  = useRef<HTMLCanvasElement>(null);
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const soundOnRef   = useRef(true);
  soundOnRef.current = soundOn;

  const { completed, total } = missionProgress;
  const segKinds = Array.from({ length: total }, (_, i) => {
    if (i < completed - 1) return 'prefilled';
    if (i === completed - 1) return 'fresh';
    return 'empty';
  });

  // ── Orin positioning ─────────────────────────────────────────────────────────
  // Beat 1: JS-placed on the card's layout box (his feet overlap the top edge, lower
  // body tucks BEHIND the card because Orin sits at a lower z-index than the card).
  const placeOrinOnCard = useCallback(() => {
    const orin = orinRef.current;
    const card = cardRef.current;
    if (!orin || !card) return;
    const w = Math.min(400, window.innerWidth * 0.8);
    orin.style.width  = `${w}px`;
    orin.style.height = `${w}px`;
    orin.style.left   = `${card.offsetLeft + card.offsetWidth / 2}px`;
    orin.style.top    = `${card.offsetTop - w * 0.40}px`;
  }, []);

  // Move Orin to his mark for the active beat. Beats 2/3 use the CSS position classes
  // (which the 0.75s transition animates toward); clear Beat 1's inline anchor so the
  // class can take over.
  const positionOrin = useCallback((b: Beat) => {
    const orin = orinRef.current;
    if (!orin) return;
    orin.classList.remove('pco-orin-1', 'pco-orin-2', 'pco-orin-3');
    orin.classList.add(`pco-orin-${b}`);
    if (b === 1) {
      placeOrinOnCard();
    } else {
      orin.style.left = orin.style.top = orin.style.width = orin.style.height = '';
    }
  }, [placeOrinOnCard]);

  useEffect(() => { positionOrin(beat); }, [beat, positionOrin]);

  // Nudge the video into playback — muted autoplay is usually allowed, but be explicit
  // (the celebration mounts right after a tap, so the gesture requirement is satisfied).
  useEffect(() => { orinRef.current?.play().catch(() => { /* autoplay blocked — first frame is fine */ }); }, []);

  // ── Beat 1 entrance — reuse the goal-reward "fly out of the chat panel" motion ──
  // Launch the reward card from the supplied panel box and settle it at its resting
  // centre, matching CoinRewardModal's timing (0.35s hold → 0.85s flight) exactly.
  // Measured (not CSS) because the destination depends on the card's runtime layout.
  // Orin flies out WITH the card from the same panel; the backdrop + chrome stay
  // hidden until they land (see `.pco-src` / `.pco-src-orin` styles).
  useLayoutEffect(() => {
    if (!srcEntry || !sourceRect) return;
    const card = cardRef.current;
    if (!card) return;
    const pcx = sourceRect.left + sourceRect.width / 2;
    const pcy = sourceRect.top + sourceRect.height / 2;
    const rect = card.getBoundingClientRect();
    const dx = pcx - (rect.left + rect.width / 2);
    const dy = pcy - (rect.top + rect.height / 2);
    card.style.transition = 'none';
    card.style.transform  = `translate(${dx}px, ${dy}px) scale(0.2)`;
    card.style.opacity    = '0';
    card.style.filter     = 'blur(12px)';
    // Orin travels with the card. Transform-only (never opacity) — fading a
    // mix-blend:screen video isolates it and leaves a faint light box around him.
    // Place him on the card, then aim his CSS fly animation's start at the panel.
    placeOrinOnCard();
    const orin = orinRef.current;
    if (orin) {
      orin.style.setProperty('--orin-dx', `${pcx - (parseFloat(orin.style.left) || 0)}px`);
      orin.style.setProperty('--orin-dy', `${pcy - (parseFloat(orin.style.top) || 0)}px`);
    }
    void card.offsetWidth; // reflow so the jump-to-panel isn't itself animated
    const EASE = 'cubic-bezier(0.16,1,0.3,1)';
    card.style.transition = `transform 0.85s 0.35s ${EASE}, opacity 0.85s 0.35s ${EASE}, filter 0.85s 0.35s ${EASE}`;
    card.style.transform  = 'translate(0px, 0px) scale(1)';
    card.style.opacity    = '1';
    card.style.filter     = 'blur(0px)';
  }, [srcEntry, sourceRect]);

  useEffect(() => {
    function onResize() { if (beat === 1) placeOrinOnCard(); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [beat, placeOrinOnCard]);

  // ── Sound (Web Audio, progressive enhancement) ───────────────────────────────
  const note = useCallback((freq: number, t0: number, dur: number, gain = 0.08, type: OscillatorType = 'sine') => {
    if (!soundOnRef.current) return;
    try {
      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + t0);
      g.gain.linearRampToValueAtTime(gain, ctx.currentTime + t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dur + 0.05);
    } catch { /* audio unavailable — silent */ }
  }, []);
  const chimeClaim = useCallback(() => { note(523.25, 0, 0.35); note(659.25, 0.09, 0.4); note(783.99, 0.18, 0.55, 0.07); }, [note]);
  const tickArrive = useCallback(() => note(1318.5, 0, 0.08, 0.05, 'triangle'), [note]);

  // ── Confetti (fires on claim, from the card) ─────────────────────────────────
  const fireConfetti = useCallback((cx: number, cy: number) => {
    if (REDUCED) return;
    const canvas = confettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const COLORS = ['#06D6A0', '#00f2ea', '#c0a7ff', '#ffd166', '#ffffff'];
    const parts = Array.from({ length: 90 }, (_, i) => ({
      x: cx + (Math.random() - 0.5) * 120, y: cy,
      vx: (Math.random() - 0.5) * 11, vy: -(4 + Math.random() * 9),
      s: 3 + Math.random() * 5, c: COLORS[i % COLORS.length],
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.25, life: 1,
    }));
    const t0 = performance.now();
    function frame(now: number) {
      const dt = (now - t0) / 1000;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      let alive = false;
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.r += p.vr;
        p.life = Math.max(0, 1 - dt / 1.9);
        if (p.life > 0 && p.y < canvas!.height + 20) alive = true;
        ctx!.save();
        ctx!.globalAlpha = p.life;
        ctx!.translate(p.x, p.y); ctx!.rotate(p.r);
        ctx!.fillStyle = p.c;
        ctx!.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx!.restore();
      }
      if (alive) requestAnimationFrame(frame);
      else ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
    }
    requestAnimationFrame(frame);
  }, [REDUCED]);

  // ── Claim flow ───────────────────────────────────────────────────────────────
  function countDownCoins(from: number, dur: number) {
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1);
      setCoinCount(Math.round(from * (1 - p)));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function pillCountUp(onDone?: () => void) {
    setPillPulse(true);
    tickArrive();
    const start = performance.now(); const DUR = 600;
    function tick(now: number) {
      const p = Math.min((now - start) / DUR, 1);
      setPillBalance(Math.round(preBalance + award.amount * p));
      if (p < 1) requestAnimationFrame(tick);
      else { setTimeout(() => setPillPulse(false), 400); onDone?.(); }
    }
    requestAnimationFrame(tick);
  }

  function flyCoins(onDone: () => void) {
    const counter = coinCountRef.current?.getBoundingClientRect();
    const pill = pillRef.current?.getBoundingClientRect();
    if (!counter || !pill) { onDone(); return; }
    const sx = counter.left + counter.width / 2, sy = counter.top + counter.height / 2;
    const tx = pill.left + pill.width / 2, ty = pill.top + pill.height / 2;
    const N = 9;
    let firstArrival = true;
    for (let i = 0; i < N; i++) {
      const c = document.createElement('div');
      c.className = 'pco-fly-coin';
      c.style.left = `${sx}px`; c.style.top = `${sy}px`;
      document.body.appendChild(c);
      const arcX = Math.sin(i * 2.4) * 90;
      const anim = c.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${(tx - sx) / 2 + arcX}px, ${(ty - sy) / 2 - 90}px) scale(0.9)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${tx - sx}px, ${ty - sy}px) scale(0.35)`, opacity: 0.9 },
      ], { duration: 750, delay: i * 70, easing: 'cubic-bezier(0.3,0,0.6,1)', fill: 'forwards' });
      anim.onfinish = () => {
        c.remove();
        if (firstArrival) { firstArrival = false; setPillPulse(true); setTimeout(() => setPillPulse(false), 250); tickArrive(); }
        if (i === N - 1) pillCountUp(onDone);
      };
    }
  }

  function handleB1Cta() {
    if (claimState === 'claim') {
      setClaim('busy');
      chimeClaim();
      const card = cardRef.current?.getBoundingClientRect();
      if (card) fireConfetti(card.left + card.width / 2, card.top + 40);

      const settle = () => {
        setClaimed(true);
        setBalance(award.newBalance); // persist to the app header pill (under the overlay)
        setClaim('learn');
      };

      if (REDUCED) {
        setCoinCount(0);
        setPillBalance(award.newBalance);
        settle();
        return;
      }
      countDownCoins(award.amount, 1150);
      flyCoins(settle);
    } else if (claimState === 'learn') {
      setBeat(2);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────────
  function handleExploreNext() {
    if (!nextPlanet) return;
    onClose();
    router.push(`/landscape/${nextPlanet.id}?lang=${language}${classId ? `&classId=${classId}` : ''}`);
  }
  function handleBackToMap() {
    onClose();
    router.push(classId ? `/landscape?classId=${classId}` : '/landscape');
  }
  function handleBackToHome() {
    onClose();
    router.push('/home');
  }

  const isMission = variant === 'mission' || !nextPlanet;
  const insightCount = insights.length;

  return (
    <div ref={rootRef} className={`pco${isRTL ? ' pco-rtl' : ''}${REDUCED ? ' pco-reduced' : ''}${srcEntry ? ' pco-src' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Backdrop: solid veil + stars + nebula. In `pco-src` mode this whole group
           dims in only after the Beat-1 card has flown out of the chat and landed,
           so the planet screen stays visible through the flight (goal-reward feel). ── */}
      <div className="pco-backdrop">
        <div className="pco-veil" />
        <div className="pco-stars">
          {STAR_PTS.map(([l, top, s, dl, d, op], i) => (
            <div key={i} className="pco-star-pt" style={{
              left: `${l}%`, top: `${top}%`, width: s, height: s,
              ['--d' as string]: `${d}s`, ['--dl' as string]: `${dl}s`, ['--op' as string]: op,
            }} />
          ))}
        </div>
        <div className="pco-nebula-backdrop" />
        <div className="pco-nebula-blob-1" />
        <div className="pco-nebula-blob-2" />
        <div className="pco-nebula-fog" />
      </div>

      {/* ── Orin: whole video, screen-blended, TRAVELS between beats ── */}
      <video ref={orinRef} className={`pco-orin pco-orin-1${srcEntry ? ' pco-src-orin' : ''}`} src={orinVideoUrl} autoPlay loop muted playsInline />

      <canvas ref={confettiRef} className="pco-confetti" />

      {/* Stardust motes on card materialize */}
      {!REDUCED && MOTES.map((m, i) => (
        <div key={i} className="pco-mote" style={{
          left: m.left, top: m.top, width: m.size, height: m.size,
          background: m.color, boxShadow: `0 0 ${m.size * 3}px ${m.color}`,
          ['--dl' as string]: m.dl, ['--dx' as string]: m.dx, ['--dy' as string]: m.dy,
        }} />
      ))}

      {/* ── Persistent chrome ── */}
      <div className="pco-step-dots">
        {[1, 2, 3].map(n => (
          <div key={n} className={`pco-sdot${beat === n ? ' pco-active' : ''}${n < beat ? ' pco-done' : ''}`} />
        ))}
      </div>
      <button className="pco-skip" onClick={onClose}>{t('skipCelebration', language)}</button>
      <button className="pco-sound" onClick={() => setSoundOn(s => !s)} title="Sound on/off">{soundOn ? '🔊' : '🔇'}</button>
      <div ref={pillRef} className={`pco-pill${pillPulse ? ' pco-pulse' : ''}`}>✦ <span>{pillBalance}</span></div>

      {/* ── BEAT 1 ── */}
      <div className={`pco-beat pco-b1${beat === 1 ? ' pco-active' : ''}`}>
        <div ref={cardRef} className={`pco-reward-card${srcEntry ? ' pco-src-entry' : ''}`}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div className="pco-badge"><div className="pco-badge-dot" />{t('achievementUnlocked', language)}</div>
            <h1 className="pco-card-title">{variant === 'mission' ? t('missionComplete', language) : t('planetExplored', language)}</h1>
            <p className="pco-card-sub">{variant === 'mission' ? t('entireMissionComplete', language) : t('uncoveredEverySecret', language)}</p>
          </div>

          <div className="pco-divider" />

          <div className={`pco-coins-row${claimed ? ' pco-claimed' : ''}`}>
            {claimed ? (
              <><span className="pco-claimed-check">✓</span><span className="pco-claimed-lbl">{t('claimedLabel', language)}</span></>
            ) : (
              <>
                <span className="pco-star">★</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span ref={coinCountRef} className="pco-coin-amount">+{coinCount}</span>
                  <span className="pco-coin-lbl">{t('coinsShort', language)}</span>
                </div>
              </>
            )}
          </div>

          <button
            className={`pco-cta${claimState === 'learn' ? ' pco-learn' : ''}${claimState === 'busy' ? ' pco-busy' : ''}`}
            onClick={handleB1Cta}
            disabled={claimState === 'busy'}
          >
            {claimState === 'claim'  && <>{t('claimReward', language)} →</>}
            {claimState === 'busy'   && <><span className="pco-spinner" /><span style={{ marginInlineStart: 8 }}>{t('claiming', language)}</span></>}
            {claimState === 'learn'  && <>{t('whatDidILearn', language)} →</>}
          </button>
        </div>
      </div>

      {/* ── BEAT 2 ── */}
      <div className={`pco-beat pco-b2${beat === 2 ? ' pco-active' : ''}`}>
        <div className="pco-b2-col">
          <div className="pco-b2-header">
            <div style={{ display: 'flex' }}>
              <div className="pco-badge"><div className="pco-badge-dot" />{planetName} · {t('planetCompleteBadge', language)}</div>
            </div>
            <div className="pco-b2-title">{t('hereEverythingCaught', language)}</div>
            <div className="pco-b2-sub">
              {t('insightsAndTerms', language)
                .replace('{insights}', String(insightCount))
                .replace('{terms}', String(introducedTerms.length))}
            </div>
          </div>
          <div className="pco-b2-div" />

          {insightCount === 0 ? (
            <p className="pco-empty">{t('noInsightsYet', language)}</p>
          ) : (
            <div className="pco-i-cards">
              {insights.map((ins, idx) => (
                <div key={ins.goalSlug || idx} className="pco-i-card" style={{ ['--i' as string]: idx }}>
                  <div className="pco-i-num">{idx + 1}</div>
                  <div>
                    {ins.termName && <div className="pco-i-term">{ins.termName}</div>}
                    <div className="pco-i-text">{ins.insightText}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {introducedTerms.length > 0 && (
            <div className="pco-terms-row">
              <div className="pco-terms-lbl">{t('newTermsVocab', language)}</div>
              {introducedTerms.map((term, i) => (
                <span key={i} className="pco-term-pill">{term.label}</span>
              ))}
            </div>
          )}

          <button className="pco-beat-cta" onClick={() => setBeat(3)}>{t('whereToNext', language)} →</button>
        </div>
      </div>

      {/* ── BEAT 3 ── */}
      <div className={`pco-beat pco-b3${beat === 3 ? ' pco-active' : ''}`}>
        <div className="pco-b3-inner">
          <div className="pco-orin-nameplate"><span className="pco-np-dot" />{t('orinName', language)}</div>
          <p className="pco-b3-speech">
            {(isMission ? t('celebrationOrinSpeechMission', language) : t('celebrationOrinSpeech', language))
              .replace('{name}', nextPlanet?.label ?? '')}
          </p>

          {total > 0 && (
            <div className="pco-b3-progress">
              <div className="pco-b3-mp-row">
                <span>{t('missionProgressLabel', language)}</span>
                <b>{t('planetsCount', language).replace('{completed}', String(completed)).replace('{total}', String(total))}</b>
              </div>
              <div className="pco-b3-track">
                {segKinds.map((kind, i) => (
                  <div key={i} className={`pco-b3-seg${kind === 'prefilled' ? ' pco-prefilled' : ''}${kind === 'fresh' ? ' pco-fresh' : ''}`} />
                ))}
              </div>
            </div>
          )}

          {isMission ? (
            <>
              <div className="pco-mission-done">
                <div className="pco-md-title">{t('missionComplete', language)}</div>
                <div className="pco-md-sub">{t('entireMissionComplete', language)}</div>
              </div>
              {variant === 'mission' ? (
                <button className="pco-b3-next-card pco-mission-cta" onClick={handleBackToHome}>
                  <span className="pco-star-node pco-burst" />
                  <div className="pco-b3-next-meta">
                    <div className="pco-b3-next-name">{t('chooseNextMission', language)}</div>
                  </div>
                  <span className="pco-b3-next-arrow">→</span>
                </button>
              ) : null}
              <button className="pco-b3-ghost" onClick={handleBackToMap}>{t('celebrationBackToMap', language)}</button>
            </>
          ) : (
            <>
              <button className="pco-b3-next-card" onClick={handleExploreNext}>
                <span className="pco-star-node pco-burst" />
                <div className="pco-b3-next-meta">
                  <div className="pco-b3-next-eyebrow">{t('nextDestination', language)}</div>
                  <div className="pco-b3-next-name">{nextPlanet!.label}</div>
                  <div className="pco-b3-next-tease">{nextPlanet!.tease || nextPlanet!.title}</div>
                </div>
                <span className="pco-b3-next-arrow">→</span>
              </button>
              <button className="pco-b3-ghost" onClick={handleBackToMap}>{t('takeMeBackToMap', language)}</button>
            </>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </div>
  );
}

// ── Styles — ported from the approved "Story Flow v6" mockup, scoped under `.pco` ──
const CSS = `
.pco {
  position: fixed; inset: 0; z-index: 500;
  --teal:#06D6A0; --cyan:#00f2ea; --cyan-t:#29fcf3; --purple:#c0a7ff;
  --tp:#e2e8f0; --ts:#8896a8; --sub:rgba(185,202,200,0.8); --gold:#D4A017;
  --head:'Space Grotesk','Inter',system-ui,sans-serif;
  --body:'Hanken Grotesk','Inter',system-ui,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,monospace;
  background:transparent; color:var(--tp); font-family:var(--head);
  overflow:hidden;
}
.pco *, .pco *::before, .pco *::after { box-sizing:border-box; margin:0; padding:0; }

/* chrome */
.pco-step-dots { position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:9000; display:flex; gap:8px; align-items:center; }
.pco-sdot { width:7px; height:7px; border-radius:999px; background:rgba(255,255,255,0.18); transition:width .35s ease, background .35s ease; }
.pco-sdot.pco-done { background:rgba(6,214,160,0.55); }
.pco-sdot.pco-active { width:24px; background:var(--teal); }
.pco-skip { position:fixed; top:16px; left:20px; z-index:9000; display:inline-flex; align-items:center; gap:7px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:999px; padding:7px 15px; font-family:var(--head); font-size:12px; font-weight:600; color:var(--ts); cursor:pointer; transition:color .15s,border-color .15s; backdrop-filter:blur(6px); }
.pco-skip:hover { color:var(--tp); border-color:rgba(255,255,255,0.3); }
.pco-rtl .pco-skip { left:auto; right:20px; }
.pco-sound { position:fixed; top:16px; left:104px; z-index:9000; width:34px; height:34px; border-radius:999px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); color:var(--ts); cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(6px); transition:color .15s,border-color .15s; }
.pco-sound:hover { color:var(--tp); border-color:rgba(255,255,255,0.3); }
.pco-rtl .pco-sound { left:auto; right:104px; }
.pco-pill { position:fixed; top:16px; right:24px; z-index:9000; display:flex; align-items:center; gap:7px; background:rgba(138,92,245,0.18); border:1px solid rgba(138,92,245,0.4); border-radius:999px; padding:7px 16px; font-size:13px; font-weight:700; color:var(--purple); font-variant-numeric:tabular-nums; transition:transform .2s, box-shadow .3s; backdrop-filter:blur(6px); }
.pco-rtl .pco-pill { right:auto; left:24px; }
.pco-pill.pco-pulse { transform:scale(1.12); box-shadow:0 0 24px rgba(192,167,255,0.5); border-color:rgba(192,167,255,0.7); }

/* ── Beat-1 entrance choreography (only in pco-src / "flew out of the chat" mode) ── */
/* Deferred backdrop: the whole dark scene dims in AFTER the card lands (0.35s hold +
   0.85s flight = 1.2s), so the planet screen shows through during the flight. */
.pco-backdrop { position:fixed; inset:0; z-index:0; pointer-events:none; }
.pco-veil { position:absolute; inset:0; background:#060812; z-index:0; }
.pco-src .pco-backdrop { animation:pco-veil-in .8s 1.2s both; }
@keyframes pco-veil-in { from{opacity:0} to{opacity:1} }
/* Chrome (step dots / skip / sound / pill) fades in with the backdrop, not over the flight. */
.pco-src .pco-step-dots, .pco-src .pco-skip, .pco-src .pco-sound, .pco-src .pco-pill { animation:pco-veil-in .8s 1.2s both; }
/* Stardust motes drift in with the backdrop instead of over the planet screen. */
.pco-src .pco-mote { animation-delay:calc(1.2s + var(--dl,0s)); animation-fill-mode:both; }
/* Beat-1 card: JS drives the fly-out from the chat panel — disable the CSS materialize
   and start hidden so there's no one-frame flash at centre before the effect runs. */
.pco-src-entry { animation:none !important; opacity:0; }
/* Orin flies out of the chat WITH the card (same 0.35s hold → 0.85s flight).
   Transform-only, never opacity — fading a mix-blend:screen video isolates it and
   leaves a faint light box around him. --orin-dx/--orin-dy are set by the entrance
   effect to point the launch at the chat panel. */
.pco-src-orin { animation:pco-orin-fly .85s .35s cubic-bezier(.16,1,.3,1) both; }
@keyframes pco-orin-fly {
  from { transform:translate(-50%,-50%) translate(var(--orin-dx,0), var(--orin-dy,0)) scale(.2); }
  to   { transform:translate(-50%,-50%) translate(0px,0px) scale(1); }
}

/* backdrop */
.pco-nebula-backdrop { position:fixed; inset:0; z-index:1; pointer-events:none; background:radial-gradient(ellipse at 50% 50%, rgba(84,23,190,0.30) 0%, rgba(9,6,20,0.90) 75%); }
.pco-nebula-blob-1 { position:fixed; width:500px; height:500px; z-index:1; pointer-events:none; background:radial-gradient(circle, rgba(138,92,245,0.14) 0%, transparent 70%); filter:blur(40px); top:10%; left:15%; }
.pco-nebula-blob-2 { position:fixed; width:500px; height:500px; z-index:1; pointer-events:none; background:radial-gradient(circle, rgba(0,242,234,0.09) 0%, transparent 70%); filter:blur(40px); bottom:10%; right:15%; }
.pco-nebula-fog { position:fixed; width:700px; height:700px; z-index:1; pointer-events:none; top:50%; left:50%; margin:-350px 0 0 -350px; background:radial-gradient(circle, rgba(138,92,245,0.10) 0%, transparent 65%); filter:blur(60px); animation:pco-fog 6s ease-in-out infinite; }
@keyframes pco-fog { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(2%,-3%) scale(1.06)} }
.pco-stars { position:fixed; inset:0; pointer-events:none; z-index:0; }
.pco-star-pt { position:absolute; border-radius:50%; background:#fff; animation:pco-twinkle var(--d,4s) var(--dl,0s) ease-in-out infinite; }
@keyframes pco-twinkle { 0%,100%{opacity:0} 50%{opacity:var(--op,.3)} }

/* Orin — whole video, screen-blend, sits BELOW cards so his body tucks behind them */
.pco-orin { position:fixed; z-index:2; transform:translate(-50%,-50%); object-fit:contain; mix-blend-mode:screen; pointer-events:none; transition:left .75s cubic-bezier(.4,0,.2,1), top .75s cubic-bezier(.4,0,.2,1), width .75s cubic-bezier(.4,0,.2,1), height .75s cubic-bezier(.4,0,.2,1); }
.pco-orin-1 { left:50%; top:30%; width:min(400px,80vw); height:min(400px,80vw); }
.pco-orin-2 { left:135px; top:calc(100% - 135px); width:210px; height:210px; }
.pco-rtl .pco-orin-2 { left:auto; right:135px; }
.pco-orin-3 { left:50%; top:27%; width:min(300px,56vw); height:min(300px,56vw); }
.pco-reduced .pco-orin { transition:none; }

.pco-mote { position:fixed; border-radius:50%; pointer-events:none; z-index:3; animation:pco-mote 1.5s var(--dl,0s) ease-in forwards; }
@keyframes pco-mote { 0%{opacity:0; transform:translate(0,0) scale(.4)} 25%{opacity:1} 75%{opacity:.9} 100%{opacity:0; transform:translate(var(--dx),var(--dy)) scale(.6)} }

.pco-confetti { position:fixed; inset:0; pointer-events:none; z-index:8000; }

/* beats */
.pco-beat { position:fixed; inset:0; z-index:10; display:none; flex-direction:column; align-items:center; overflow-y:auto; }
.pco-beat.pco-active { display:flex; }
@keyframes pco-rise { from{opacity:0; transform:translateY(16px)} to{opacity:1; transform:translateY(0)} }

/* BEAT 1 */
.pco-b1 { justify-content:center; align-items:center; padding:24px; }
.pco-reward-card { position:relative; z-index:12; width:350px; margin-top:15vh; background:rgba(26,29,46,0.85); backdrop-filter:blur(16px); border-radius:24px; border:1px solid rgba(138,92,245,0.25); box-shadow:0 0 40px rgba(0,0,0,0.5); padding:28px 28px 24px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:16px; animation:pco-card-enter .85s .35s cubic-bezier(.16,1,.3,1) both; }
.pco-reduced .pco-reward-card { animation:none; }
@keyframes pco-card-enter { from{opacity:0; transform:scale(.2) translateY(20px); filter:blur(12px)} to{opacity:1; transform:scale(1) translateY(0); filter:blur(0)} }
.pco-badge { display:inline-flex; align-items:center; gap:8px; padding:5px 14px; border-radius:9999px; background:rgba(49,53,60,0.5); border:1px solid rgba(58,74,72,0.35); font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:0.18em; color:#b9cac8; text-transform:uppercase; }
.pco-badge-dot { width:8px; height:8px; border-radius:50%; background:var(--cyan); box-shadow:0 0 8px var(--cyan); animation:pco-pulse-d 2s ease-in-out infinite; }
@keyframes pco-pulse-d { 0%,100%{opacity:1} 50%{opacity:.4} }
.pco-card-title { font-size:33px; font-weight:700; line-height:1.1; letter-spacing:-0.02em; color:var(--cyan-t); text-shadow:0 0 10px rgba(207,255,251,0.3); }
.pco-card-sub { font-family:var(--body); font-size:15px; color:var(--sub); }
.pco-divider { height:1px; width:100%; background:linear-gradient(to right, transparent, rgba(58,74,72,0.4), transparent); }
.pco-coins-row { display:flex; align-items:center; justify-content:center; gap:14px; padding:13px 28px; border-radius:9999px; width:100%; background:rgba(84,23,190,0.1); border:1px solid rgba(84,23,190,0.2); transition:background .5s, border-color .5s; min-height:58px; }
.pco-coins-row.pco-claimed { background:rgba(6,214,160,0.08); border-color:rgba(6,214,160,0.3); }
.pco-coins-row .pco-star { font-size:24px; color:var(--gold); }
.pco-coin-amount { font-size:30px; font-weight:600; color:var(--purple); font-variant-numeric:tabular-nums; }
.pco-coin-lbl { font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:0.15em; color:#849492; }
.pco-claimed-check { font-size:22px; color:var(--teal); }
.pco-claimed-lbl { font-family:var(--mono); font-size:13px; font-weight:700; letter-spacing:0.2em; color:var(--teal); }
.pco-cta { width:100%; height:48px; border:none; border-radius:12px; background:var(--cyan); color:#003735; font-family:var(--head); font-size:16px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:box-shadow .2s, background .45s, color .45s; }
.pco-cta:hover { box-shadow:0 0 20px rgba(0,242,234,0.55); }
.pco-cta.pco-learn { background:var(--teal); color:#002218; }
.pco-cta.pco-learn:hover { box-shadow:0 0 20px rgba(6,214,160,0.55); }
.pco-cta.pco-busy { pointer-events:none; }
.pco-spinner { width:15px; height:15px; border-radius:50%; border:2px solid rgba(0,55,53,0.25); border-top-color:#003735; animation:pco-spin .7s linear infinite; }
@keyframes pco-spin { to{transform:rotate(360deg)} }
.pco-fly-coin { position:fixed; z-index:9500; width:13px; height:13px; border-radius:50%; background:radial-gradient(circle at 35% 35%, #fff3cf, #ffd166 55%, #b8860b); box-shadow:0 0 12px rgba(255,209,102,0.8); pointer-events:none; }

/* star node */
.pco-star-node { border-radius:50%; position:relative; flex-shrink:0; display:inline-block; width:58px; height:58px; background:radial-gradient(circle at 38% 32%, #00091a, #00020a); border:2px solid #0099FF; box-shadow:0 0 24px rgba(0,153,255,0.35); }
.pco-star-node.pco-burst { animation:pco-node-burst 2.2s ease-in-out infinite; }
@keyframes pco-node-burst { 0%,100%{box-shadow:0 0 20px rgba(0,153,255,0.4)} 50%{box-shadow:0 0 44px rgba(0,153,255,0.65)} }

/* BEAT 2 */
.pco-b2 { padding:0; }
.pco-b2-col { width:100%; max-width:640px; padding:70px 28px 0; display:flex; flex-direction:column; flex:1; position:relative; z-index:12; }
.pco-b2-header { display:flex; flex-direction:column; gap:6px; opacity:0; animation:pco-rise .4s .05s ease-out forwards; }
.pco-reduced .pco-b2-header, .pco-reduced .pco-i-card, .pco-reduced .pco-terms-row, .pco-reduced .pco-beat-cta { opacity:1; animation:none; }
.pco-b2-title { font-size:26px; font-weight:700; color:var(--cyan-t); letter-spacing:-0.01em; text-shadow:0 0 10px rgba(207,255,251,0.25); margin-top:8px; }
.pco-b2-sub { font-family:var(--mono); font-size:10px; color:var(--ts); letter-spacing:0.14em; text-transform:uppercase; }
.pco-b2-div { height:1px; margin:20px 0; background:linear-gradient(to right, transparent, rgba(58,74,72,0.5), transparent); }
.pco-empty { font-family:var(--body); font-size:14px; color:var(--ts); padding:8px 0 24px; }
.pco-i-cards { display:flex; flex-direction:column; gap:12px; }
.pco-i-card { display:flex; gap:16px; align-items:flex-start; background:rgba(26,29,46,0.85); backdrop-filter:blur(12px); border:1px solid rgba(138,92,245,0.25); border-radius:16px; padding:17px 20px; opacity:0; transform:translateY(18px); animation:pco-rise .4s calc(.25s + var(--i,0) * .2s) ease-out forwards; }
.pco-i-num { font-family:var(--mono); font-size:11px; font-weight:700; color:var(--cyan); background:rgba(0,242,234,0.08); border:1px solid rgba(0,242,234,0.25); width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px; }
.pco-i-term { font-size:11px; font-weight:700; color:var(--cyan-t); letter-spacing:0.07em; text-transform:uppercase; margin-bottom:7px; }
.pco-i-text { font-family:var(--body); font-size:14.5px; line-height:1.7; color:var(--tp); }
.pco-terms-row { display:flex; flex-wrap:wrap; gap:8px; margin-top:22px; opacity:0; animation:pco-rise .4s .85s ease-out forwards; }
.pco-terms-lbl { width:100%; font-family:var(--mono); font-size:9.5px; color:var(--ts); letter-spacing:0.16em; text-transform:uppercase; margin-bottom:2px; }
.pco-term-pill { font-family:var(--body); font-size:12.5px; font-weight:600; color:var(--cyan-t); background:rgba(26,29,46,0.85); border:1px solid rgba(0,242,234,0.25); backdrop-filter:blur(8px); border-radius:999px; padding:7px 15px; }
.pco-beat-cta { padding:14px 44px; height:48px; border-radius:12px; border:none; cursor:pointer; background:var(--cyan); color:#003735; font-family:var(--head); font-size:16px; font-weight:600; display:inline-flex; align-items:center; justify-content:center; gap:8px; transition:box-shadow .2s; opacity:0; animation:pco-rise .5s 1s ease-out forwards; margin:28px 0 120px; align-self:stretch; }
.pco-beat-cta:hover { box-shadow:0 0 20px rgba(0,242,234,0.55); }

/* BEAT 3 */
.pco-b3 { justify-content:flex-end; padding:24px; }
.pco-b3-inner { width:100%; max-width:520px; display:flex; flex-direction:column; align-items:center; gap:18px; position:relative; z-index:12; text-align:center; padding-bottom:26px; }
.pco-orin-nameplate { display:inline-flex; align-items:center; gap:7px; background:rgba(6,8,18,0.6); backdrop-filter:blur(6px); border:1px solid rgba(6,214,160,0.35); border-radius:999px; padding:4px 13px; font-family:var(--mono); font-size:9px; font-weight:700; letter-spacing:0.2em; color:#aeffe4; opacity:0; animation:pco-rise .4s .3s ease-out forwards; }
.pco-reduced .pco-orin-nameplate, .pco-reduced .pco-b3-speech, .pco-reduced .pco-b3-progress, .pco-reduced .pco-b3-next-card, .pco-reduced .pco-b3-ghost, .pco-reduced .pco-mission-done { opacity:1; animation:none; }
.pco-np-dot { width:5px; height:5px; border-radius:50%; background:var(--teal); }
.pco-b3-speech { font-family:var(--body); font-size:15.5px; color:var(--tp); line-height:1.6; max-width:400px; text-shadow:0 1px 8px rgba(6,8,18,0.8); opacity:0; animation:pco-rise .4s .4s ease-out forwards; margin-top:-6px; }
.pco-b3-progress { width:100%; display:flex; flex-direction:column; gap:10px; background:rgba(26,29,46,0.85); backdrop-filter:blur(12px); border:1px solid rgba(138,92,245,0.25); border-radius:16px; padding:16px 20px; opacity:0; animation:pco-rise .4s .2s ease-out forwards; }
.pco-b3-mp-row { display:flex; justify-content:space-between; align-items:baseline; font-family:var(--mono); font-size:10px; letter-spacing:0.14em; color:var(--ts); text-transform:uppercase; }
.pco-b3-mp-row b { color:var(--cyan-t); font-size:12px; }
.pco-b3-track { height:8px; border-radius:6px; background:rgba(255,255,255,0.09); overflow:hidden; display:flex; gap:3px; padding:2px; }
.pco-b3-seg { flex:1; border-radius:4px; background:rgba(255,255,255,0.06); position:relative; overflow:hidden; }
.pco-b3-seg.pco-prefilled::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg, #06D6A0, #00f2ea); }
.pco-b3-seg.pco-fresh { overflow:visible; }
.pco-b3-seg.pco-fresh::after { content:''; position:absolute; inset:0; border-radius:4px; background:linear-gradient(90deg, #06D6A0, #00f2ea); transform-origin:left; animation:pco-seg-fill .5s .8s ease-out both, pco-seg-glow .9s 1.35s ease-out 1; }
.pco-rtl .pco-b3-seg.pco-fresh::after { transform-origin:right; }
.pco-reduced .pco-b3-seg.pco-fresh::after { animation:none; }
@keyframes pco-seg-fill { from{transform:scaleX(0)} to{transform:scaleX(1)} }
@keyframes pco-seg-glow { 0%{box-shadow:0 0 0 rgba(0,242,234,0)} 40%{box-shadow:0 0 16px rgba(0,242,234,0.8)} 100%{box-shadow:0 0 0 rgba(0,242,234,0)} }
.pco-b3-next-card { width:100%; display:flex; align-items:center; gap:18px; background:rgba(26,29,46,0.85); backdrop-filter:blur(12px); border:1px solid rgba(0,153,255,0.4); border-radius:18px; padding:18px 22px; cursor:pointer; text-align:start; opacity:0; animation:pco-rise .4s .6s ease-out forwards; transition:transform .18s, box-shadow .25s, border-color .2s; font-family:var(--head); }
.pco-b3-next-card:hover { transform:translateY(-3px); box-shadow:0 8px 32px rgba(0,153,255,0.22); border-color:rgba(0,153,255,0.7); }
.pco-b3-next-meta { flex:1; }
.pco-b3-next-eyebrow { font-family:var(--mono); font-size:9px; letter-spacing:0.2em; color:#4db8ff; margin-bottom:5px; }
.pco-b3-next-name { font-size:17px; font-weight:700; color:#fff; margin-bottom:3px; }
.pco-b3-next-tease { font-family:var(--body); font-size:12.5px; color:var(--ts); line-height:1.45; }
.pco-b3-next-arrow { font-size:22px; color:#4db8ff; flex-shrink:0; }
.pco-rtl .pco-b3-next-arrow { transform:scaleX(-1); }
.pco-mission-done { display:flex; flex-direction:column; gap:6px; opacity:0; animation:pco-rise .4s .45s ease-out forwards; }
.pco-md-title { font-size:22px; font-weight:800; color:var(--gold); }
.pco-md-sub { font-family:var(--body); font-size:13px; color:var(--ts); }
.pco-mission-cta .pco-star-node { --ring:var(--teal); border-color:var(--teal); box-shadow:0 0 24px rgba(6,214,160,0.35); }
.pco-b3-ghost { background:none; border:none; cursor:pointer; font-family:var(--head); font-size:13px; font-weight:600; color:var(--ts); padding:8px 16px; opacity:0; animation:pco-rise .4s .75s ease-out forwards; transition:color .15s; }
.pco-b3-ghost:hover { color:var(--tp); }

@media (max-width:760px) {
  .pco-orin-2 { left:70px; top:calc(100% - 80px); width:130px; height:130px; }
  .pco-rtl .pco-orin-2 { left:auto; right:70px; }
  .pco-orin-3 { top:22%; }
  .pco-sound { left:96px; }
  .pco-rtl .pco-sound { left:auto; right:96px; }
  .pco-reward-card { width:100%; max-width:350px; }
}
`;
