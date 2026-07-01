'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import OrinOrb from '@/components/OrinOrb';
import { getPlanetMeta } from '@/lib/planet-meta';
import { PLANET_EXPERIENCE } from '@/lib/planet-experience';
import { useOrinChat } from '@/hooks/useOrinChat';
import { getFirstName, clearSession } from '@/lib/student-store';
import { supabaseSignOut, getSessionStudentId } from '@/lib/session';
import { usePlanetVoice } from '@/hooks/usePlanetVoice';
import { useCoinReward } from '@/hooks/useCoinReward';
import PlanetVoicePanel from '@/components/PlanetVoicePanel';
import PlanetSummaryScreen from '@/components/PlanetSummaryScreen';
import { t, type Lang } from '@/lib/i18n';
import { type SummaryInsight, type PlanetVoiceMessage } from '@/hooks/usePlanetVoice';
import { parseKeywordChips } from '@/lib/parseKeywordChips';

const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL ?? 'https://astorli-bot.vercel.app';

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
  const searchParams = useSearchParams();
  const classId = searchParams.get('classId');
  const [planet, setPlanet]           = useState<Planet | null>(null);
  const [loading, setLoading]         = useState(true);
  const [missionLang, setMissionLang] = useState<Lang>('en');
  const [isAvatarThinking, setIsAvatarThinking] = useState(false);
  const { triggerReward } = useCoinReward();
  const [shownMsgCount, setShownMsgCount] = useState(0);
  const thinkingStartTime = useRef(0);
  const processedMsgCount = useRef(0);
  const isThinkingRef = useRef(false);
  const firstName = getFirstName() || 'Traveler';
  const orin = useOrinChat('planet_screen', params.id, 'planet');
  const planetVoice = usePlanetVoice(params.id, missionLang);
  const [savedInsights, setSavedInsights]         = useState<SummaryInsight[]>([]);
  const [savedIntroducedTerms, setSavedIntroducedTerms] = useState<string[]>([]);
  const [showSummaryReview, setShowSummaryReview] = useState(false);
  const [isPlanetLocked, setIsPlanetLocked]       = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleSignOut = () => {
    clearSession();
    supabaseSignOut().catch(() => {});
    router.push('/');
  };

  function extractIntroducedTerms(msgs: PlanetVoiceMessage[]): string[] {
    const seen = new Set<string>();
    for (const msg of msgs) {
      if (msg.speaker !== 'figure') continue;
      for (const seg of parseKeywordChips(msg.content)) {
        if (seg.type === 'keyword') seen.add(seg.value);
      }
    }
    return Array.from(seen);
  }

  useEffect(() => { isThinkingRef.current = isAvatarThinking; }, [isAvatarThinking]);

  // Check whether this planet is already locked for this student
  useEffect(() => {
    if (!params.id) return;
    getSessionStudentId().then(sid => {
      if (!sid) return;
      fetch(`${BOT_URL}/api/planet-voice/summary?studentId=${encodeURIComponent(sid)}&planetId=${encodeURIComponent(params.id)}`)
        .then(r => r.json())
        .then(data => { if (data.locked) setIsPlanetLocked(true); })
        .catch(() => {});
    });
  }, [params.id]);

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

  // Show the reward modal when the bot awards coins server-side.
  // The award itself is now durable (written to coin_reward_log by the bot route),
  // so the client just needs to display the modal when a new award arrives.
  useEffect(() => {
    const award = planetVoice.coinAward;
    if (!award?.awarded) return;
    const isFinalGoal = planetVoice.completionReady;
    const isGoalCompletion = award.eventType === 'goal_completion';
    triggerReward({
      awarded:          true,
      amount:           award.amount,
      newBalance:       award.newBalance,
      eventType:        award.eventType as 'goal_completion' | 'first_vote' | 'planet_complete' | 'mission_complete' | 'bonus_mission',
      titleOverride:    isGoalCompletion
        ? (isFinalGoal ? 'Planet Explored!' : 'Goal Reached')
        : undefined,
      subtitleOverride: isGoalCompletion
        ? (isFinalGoal
            ? "You've uncovered every secret on this planet."
            : 'Keep exploring the universe.')
        : undefined,
      onDismiss: (isGoalCompletion && isFinalGoal)
        ? () => planetVoice.setShowSummary(true)
        : undefined,
    });
  }, [planetVoice.coinAward, planetVoice.completionReady, triggerReward]);

  // Show the reward the bot's complete endpoint already awarded when the
  // student locked in their summary. The bot pre-merges planet + mission
  // completion into one reward when both fire on the same lock-in, so this
  // is always a single popup — never two back to back.
  function handleMissionLockIn(
    reward?: { awarded: boolean; amount: number; newBalance: number; eventType: string } | null,
  ) {
    planetVoice.setShowSummary(false);
    setIsPlanetLocked(true);

    if (reward?.awarded) {
      triggerReward({
        awarded:    true,
        amount:     reward.amount,
        newBalance: reward.newBalance,
        eventType:  reward.eventType as 'planet_complete' | 'mission_complete',
      });
    }
    // Stay on planet page — the discovery button is now visible
  }

  function handleSend() {
    if (!orin.input.trim() || isAvatarThinking) return;
    setIsAvatarThinking(true);
    thinkingStartTime.current = Date.now();
    orin.send();
  }

  useEffect(() => {
    fetch(`/api/student/mission?planetId=${params.id}`)
      .then(r => r.json())
      .then(({ planet }) => {
        setPlanet(planet);
        setMissionLang(planet?.missionLanguage === 'he' ? 'he' : 'en');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  async function handleViewDiscovery() {
    try {
      const [summaryRes, histRes] = await Promise.all([
        fetch('/api/student/planet-summaries'),
        getSessionStudentId().then(sid =>
          sid
            ? fetch(`${BOT_URL}/api/planet-voice/history?studentId=${encodeURIComponent(sid)}&planetId=${encodeURIComponent(params.id)}`)
            : null,
        ),
      ]);

      const summaryData = await summaryRes.json();
      const match = (summaryData.summaries ?? []).find(
        (s: { planetId: string }) => s.planetId === params.id,
      );
      setSavedInsights(
        (match?.insights ?? []).map((g: { termName?: string; insightText: string; studentAddition: string | null }) => ({
          goalSlug:        '',
          termName:        g.termName,
          insightText:     g.insightText,
          evidence:        '',
          studentAddition: g.studentAddition ?? undefined,
        })),
      );

      if (histRes?.ok) {
        const histData = await histRes.json();
        const histMsgs: PlanetVoiceMessage[] = (histData.messages ?? []).map(
          (m: { role: string; content: string; speaker: string | null }) => ({
            id:      Math.random().toString(36).slice(2),
            speaker: m.speaker === 'figure' ? 'figure' : m.speaker === 'orin' ? 'orin' : 'student',
            content: m.content,
          }),
        );
        setSavedIntroducedTerms(extractIntroducedTerms(histMsgs));
      }
    } catch {
      setSavedInsights([]);
    }
    setShowSummaryReview(true);
  }

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
          <button onClick={() => router.push(classId ? `/landscape?classId=${classId}` : '/landscape')} className="btn-ghost font-space text-xs">
            {t('backToLandscape', missionLang)}
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
            onClick={() => router.push(classId ? `/landscape?classId=${classId}` : '/landscape')}
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
            {t('backToMap', missionLang)}
          </button>
        </div>
        {figureDisplayName && (
          <span className="text-[10px] tracking-wide text-[#00C4CC]/60 font-space flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C4CC] inline-block" />
            {figureDisplayName} {t('isPresenting', missionLang)}
          </span>
        )}
        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center gap-2 group"
            title="Account"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className="text-[11px] text-white/40 font-space group-hover:text-white/70 transition-colors">{displayName}</span>
            <div className="w-6 h-6 rounded-full border border-[#00C4CC]/50 flex items-center justify-center bg-[#001820] group-hover:border-[#00C4CC] transition-colors">
              <span className="text-[9px] text-[#00C4CC] font-space font-bold">
                {firstName[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
          </button>

          {menuOpen && (
            <div
              className="absolute top-9 right-0 w-36 rounded-lg overflow-hidden z-50"
              style={{ background: 'rgba(0,10,18,0.95)', border: '1px solid rgba(0,196,204,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
            >
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-3 text-left text-[11px] tracking-[0.15em] font-space text-white/60 hover:text-white hover:bg-white/5 transition-colors uppercase"
              >
                Sign Out
              </button>
            </div>
          )}
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
                <span className="text-[9px] tracking-[0.18em] text-white/50 font-space uppercase">{t('speakingWith', missionLang)}</span>
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
              onClick={() => router.push(classId ? `/landscape?classId=${classId}` : '/landscape')}
              className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] font-space text-white/30 hover:text-white/60 transition-colors uppercase"
            >
              {t('backToLandscape', missionLang)}
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
            <p className="text-[9px] tracking-[0.18em] text-[#9b8fd4]/50 font-space uppercase mb-1.5">{t('yourMission', missionLang)}</p>
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
                loading={planetVoice.loading}
                thinking={planetVoice.thinking}
                studentFirstName={firstName}
                missionTitle={planet.title}
                openingGreeting={(planet.openingMessage ?? experience?.greeting ?? undefined)
                  ?.replace(/\{\{first_name\}\}/g, firstName)
                  ?.replace(/\[שם תלמיד\]/g, firstName)
                  ?.replace(/\[student name\]/gi, firstName)}
                studentRevealMessage={planet.studentRevealMessage ?? undefined}
                missionLang={missionLang}
                totalGoals={planetVoice.totalGoals}
                goalsDiscovered={Object.values(planetVoice.perkinsMap).filter(v => v !== null).length}
                characterFirstName={figureDisplayName?.split(' ')[0]}
                onViewDiscovery={handleViewDiscovery}
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

            {/* Planet Summary Screen overlay — lock flow */}
            <AnimatePresence>
              {planetVoice.showSummary && (
                <PlanetSummaryScreen
                  studentId={planetVoice.studentId ?? ''}
                  planetId={params.id}
                  insights={planetVoice.summaryInsights}
                  completionType={planetVoice.completionType ?? 'standard'}
                  onLocked={handleMissionLockIn}
                  onDismiss={() => planetVoice.setShowSummary(false)}
                  language={missionLang}
                  introducedTerms={extractIntroducedTerms(planetVoice.messages)}
                />
              )}
            </AnimatePresence>

            {/* Planet Summary Screen overlay — review flow (read-only, after planet locked) */}
            <AnimatePresence>
              {showSummaryReview && (
                <PlanetSummaryScreen
                  studentId={planetVoice.studentId ?? ''}
                  planetId={params.id}
                  insights={savedInsights}
                  completionType="standard"
                  onLocked={() => {}}
                  onDismiss={() => setShowSummaryReview(false)}
                  language={missionLang}
                  mode="review"
                  introducedTerms={savedIntroducedTerms}
                />
              )}
            </AnimatePresence>
          </div>

        </aside>
      </div>

    </motion.div>
  );
}
