'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import OrinOrb from '@/components/OrinOrb';
import { getPlanetMeta } from '@/lib/planet-meta';
import { PLANET_EXPERIENCE } from '@/lib/planet-experience';
import { useOrinChat } from '@/hooks/useOrinChat';
import { getFirstName } from '@/lib/student-store';
import { usePlanetVoice } from '@/hooks/usePlanetVoice';
import PlanetVoicePanel from '@/components/PlanetVoicePanel';
import PlanetSummaryScreen from '@/components/PlanetSummaryScreen';

interface Planet {
  id: string;
  title: string;
  label: string | null;
  content: string;
  openingMessage:       string | null;
  characterFigure:      string | null;
  characterYear:        string | null;
  characterLocation:    string | null;
  studentRevealMessage: string | null;
}


export default function PlanetPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [planet, setPlanet] = useState<Planet | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAvatarThinking, setIsAvatarThinking] = useState(false);
  const [shownMsgCount, setShownMsgCount] = useState(0);
  const thinkingStartTime = useRef(0);
  const processedMsgCount = useRef(0);
  const isThinkingRef = useRef(false);
  const firstName = getFirstName() || 'Traveler';
  const orin = useOrinChat('planet_screen', params.id, 'planet');
  const planetVoice = usePlanetVoice(params.id);

  useEffect(() => { isThinkingRef.current = isAvatarThinking; }, [isAvatarThinking]);

  useEffect(() => {
    if (orin.messages.length <= processedMsgCount.current) return;
    const newestMsg = orin.messages[orin.messages.length - 1];
    processedMsgCount.current = orin.messages.length;

    if (newestMsg.role === 'user' || !isThinkingRef.current) {
      setShownMsgCount(orin.messages.length);
    } else {
      const elapsed   = Date.now() - thinkingStartTime.current;
      const target    = Math.min(2500, 1200 + newestMsg.content.length * 15);
      const remaining = Math.max(0, target - elapsed);
      setTimeout(() => {
        setShownMsgCount(orin.messages.length);
        setIsAvatarThinking(false);
      }, remaining);
    }
  }, [orin.messages.length]);

  function handleSend() {
    if (!orin.input.trim() || isAvatarThinking) return;
    setIsAvatarThinking(true);
    thinkingStartTime.current = Date.now();
    orin.send();
  }

  useEffect(() => {
    fetch(`/api/student/mission?planetId=${params.id}`)
      .then(r => r.json())
      .then(({ planet }) => { setPlanet(planet); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-5 h-5 rounded-full border-2 border-[#00C4CC]/30 border-t-[#00C4CC] animate-spin" />
      </div>
    );
  }

  if (!planet) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 font-space text-sm mb-4">Planet not found</p>
          <button onClick={() => router.push('/landscape')} className="btn-ghost font-space text-xs">
            ← BACK TO LANDSCAPE
          </button>
        </div>
      </div>
    );
  }

  const label = planet.label ?? getPlanetMeta(planet.title).label;
  const experience = PLANET_EXPERIENCE[label] ?? null;
  const character = planetVoice.character;

  const figureDisplayName = character?.name ?? planet.characterFigure ?? experience?.figure ?? null;
  const figureLocation    = character?.location ?? planet.characterLocation ?? experience?.location ?? null;
  const figureEra         = character?.era
    ?? (planet.characterYear && figureLocation
          ? `${figureLocation} · ${planet.characterYear} CE`
          : planet.characterYear ? `${planet.characterYear} CE`
          : experience?.year && figureLocation
            ? `${figureLocation} · ${experience.year} CE`
            : experience?.year ? `${experience.year} CE` : null);

  const displayName = (() => { const n = firstName; return n ? n[0].toUpperCase() + n.slice(1, 2) + '.' : 'A.'; })();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative h-screen bg-black overflow-hidden flex flex-col"
    >
      <StarField count={60} seed={params.id.length * 7} />

      {/* Top bar */}
      <header className="relative z-20 flex-shrink-0 flex items-center justify-between px-5 h-11 border-b border-white/5 bg-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/landscape')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-space tracking-[0.12em] font-semibold uppercase transition-all"
            style={{
              border: '1px solid rgba(255,45,120,.4)',
              background: 'rgba(255,45,120,.08)',
              color: '#FF2D78',
              animation: 'mapPulse 3s ease-in-out infinite',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,45,120,.16)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,45,120,.08)'; }}
          >
            ← MAP
          </button>
        </div>
        {figureDisplayName && (
          <span className="text-[10px] tracking-wide text-[#00C4CC]/60 font-space flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C4CC] inline-block" />
            {figureDisplayName} is presenting
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/40 font-space">{displayName}</span>
          <div className="w-6 h-6 rounded-full border border-[#00C4CC]/50 flex items-center justify-center bg-[#001820]">
            <span className="text-[9px] text-[#00C4CC] font-space font-bold">
              {firstName[0]?.toUpperCase() ?? 'A'}
            </span>
          </div>
        </div>
      </header>

      {/* Main content row */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Left — Cinematic figure panel ── */}
        <div className="flex-1 relative overflow-hidden bg-black">

          {/* SPEAKING WITH badge — top left overlay */}
          {figureDisplayName && (
            <div className="absolute top-4 left-5 z-40">
              {/* Connection beam — from badge diagonally toward figure face area */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '100%',
                width: 160,
                height: 1,
                transformOrigin: 'left center',
                transform: 'rotate(28deg)',
                background: 'linear-gradient(90deg, rgba(0,212,212,0.18) 0%, rgba(155,92,255,0.10) 55%, transparent 100%)',
                animation: 'edgeFlow 4s ease-in-out infinite alternate',
                pointerEvents: 'none',
              }} />
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-white/12 bg-black/50 backdrop-blur-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00C4CC] opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00C4CC]" />
                </span>
                <span className="text-[9px] tracking-[0.18em] text-white/50 font-space uppercase">SPEAKING WITH</span>
              </div>
            </div>
          )}

          {/* Scanline texture */}
          <div
            className="absolute inset-0 z-10 pointer-events-none opacity-[0.04]"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,1) 0px, rgba(255,255,255,1) 1px, transparent 1px, transparent 3px)' }}
          />

          {/* Figure — fills the full panel */}
          {character?.listening_video_url ? (
            <video
              src={planetVoice.thinking && character.thinking_video_url
                ? character.thinking_video_url
                : character.listening_video_url}
              className="absolute inset-0 w-full h-full object-cover object-top"
              autoPlay loop muted playsInline
            />
          ) : character?.portrait_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.portrait_url}
              alt={character.name}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          ) : figureDisplayName ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[140px] text-white/[0.025] font-space font-bold select-none leading-none">
                {figureDisplayName.split(' ').map((w: string) => w[0]).join('')}
              </span>
            </div>
          ) : null}

          {/* Cinematic gradients */}
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.3) 100%)' }}
          />
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{ background: 'linear-gradient(to right, transparent 65%, rgba(0,0,0,0.55) 100%)' }}
          />
          {/* Ambient bleed — purple energy from the chat panel bleeds back onto the figure */}
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 30% 60% at 95% 50%, rgba(155,92,255,0.12) 0%, transparent 70%)' }}
          />

          {/* Character name — bottom overlay (above the nav bar) */}
          {figureDisplayName && (
            <div className="absolute bottom-11 left-0 right-0 z-30 px-7 pb-5">
              {figureEra && (
                <p className="text-[9px] tracking-[0.3em] text-white/35 font-space uppercase mb-1.5">
                  {figureEra}
                </p>
              )}
              <p
                className="text-2xl font-space font-extrabold tracking-wide leading-tight text-white"
                style={{ animation: 'nameGlow 4s ease-in-out infinite alternate' }}
              >
                {figureDisplayName}
              </p>
            </div>
          )}

          {/* Bottom nav bar — inside left panel */}
          <div className="absolute bottom-0 left-0 right-0 z-40 h-11 border-t border-white/6 bg-black/75 backdrop-blur-sm flex items-center justify-between px-5">
            <span className="text-[9px] tracking-[0.18em] text-white/30 font-space uppercase">
              {figureEra ? `TEMPORAL LINK · ${figureEra}` : `PLANET · ${label.toUpperCase()}`}
            </span>
            <div className="flex items-center gap-3">
              <button className="text-white/25 hover:text-white/60 transition-colors text-xs">←</button>
              <button className="text-white/25 hover:text-white/60 transition-colors text-xs">→</button>
            </div>
            <button
              onClick={() => router.push('/landscape')}
              className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] font-space text-white/30 hover:text-white/60 transition-colors uppercase"
            >
              ← BACK TO LANDSCAPE
            </button>
          </div>
        </div>

        {/* ── Right — Chat + Notebook panel ── */}
        <aside className="panel w-[380px] flex-shrink-0 flex flex-col overflow-hidden" style={{ position: 'relative' }}>
          {/* Atmospheric depth — nebula tint + animated left-edge strip */}
          <div className="absolute inset-0 pointer-events-none z-0" style={{
            background: 'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(155,92,255,0.04) 0%, transparent 60%)',
          }} />
          <div className="absolute top-0 bottom-0 left-0 w-px pointer-events-none z-0" style={{
            background: 'linear-gradient(to bottom, transparent 0%, rgba(155,92,255,0.4) 30%, rgba(255,45,120,0.25) 65%, transparent 100%)',
            animation: 'edgeFlow 5s ease-in-out infinite alternate',
          }} />

          {/* Mission context — always pinned */}
          <div className="px-4 py-3 border-b border-white/5 flex-shrink-0" style={{ borderLeft: '2px solid rgba(155,143,212,0.35)' }}>
            <p className="text-[9px] tracking-[0.18em] text-[#9b8fd4]/50 font-space uppercase mb-1.5">YOUR MISSION</p>
            <p className="text-[15px] font-semibold text-white/80 font-inter leading-snug">{planet.title}</p>
          </div>

          {/* Chat panel — fills remaining space */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
            {character ? (
              <PlanetVoicePanel
                character={character}
                messages={planetVoice.messages}
                input={planetVoice.input}
                setInput={planetVoice.setInput}
                send={planetVoice.send}
                sendText={planetVoice.sendText}
                askOrin={planetVoice.askOrin}
                loading={planetVoice.loading}
                thinking={planetVoice.thinking}
                studentFirstName={firstName}
                missionTitle={planet.title}
                openingGreeting={planet.openingMessage ?? experience?.greeting ?? undefined}
                studentRevealMessage={planet.studentRevealMessage ?? undefined}
                completionReady={planetVoice.completionReady}
                onCompleteLearning={() => planetVoice.setShowSummary(true)}
              />
            ) : planetVoice.charLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="w-4 h-4 rounded-full border-2 border-[#00C4CC]/30 border-t-[#00C4CC] animate-spin" />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[11px] text-white/30 font-space">No character available for this planet.</p>
              </div>
            )}

            {/* Planet Summary Screen overlay */}
            <AnimatePresence>
              {planetVoice.showSummary && planetVoice.summaryInsights.length > 0 && (
                <PlanetSummaryScreen
                  studentId={planetVoice.studentId ?? ''}
                  planetId={params.id}
                  insights={planetVoice.summaryInsights}
                  completionType={planetVoice.completionType ?? 'standard'}
                  onLocked={() => router.push('/landscape')}
                  onDismiss={() => planetVoice.setShowSummary(false)}
                />
              )}
            </AnimatePresence>
          </div>

        </aside>
      </div>

    </motion.div>
  );
}
