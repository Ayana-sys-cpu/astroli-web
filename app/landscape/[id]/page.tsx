'use client';
import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import OrinOrb from '@/components/OrinOrb';
import { getPlanetMeta } from '@/lib/planet-meta';
import { PLANET_EXPERIENCE } from '@/lib/planet-experience';
import { useOrinChat } from '@/hooks/useOrinChat';
import { getFirstName, loadStudent } from '@/lib/student-store';
import { getSessionStudentId } from '@/lib/session';
import TopBar from '@/components/TopBar';
import { usePlanetVoice } from '@/hooks/usePlanetVoice';
import { useCoinReward } from '@/hooks/useCoinReward';
import dynamic from 'next/dynamic';
// Voice/chat panel — only rendered once a character is loaded for the planet,
// so it's code-split out of the initial page bundle.
const PlanetVoicePanel = dynamic(() => import('@/components/PlanetVoicePanel'), { ssr: false });
import PlanetSummaryScreen from '@/components/PlanetSummaryScreen';
import { t, type Lang } from '@/lib/i18n';
import { type SummaryInsight } from '@/hooks/usePlanetVoice';
import type { MissionTerm } from '@/lib/orin-guide-types';
import PlanetCelebrationOverlay, { type NextPlanetInfo, type MissionProgressInfo } from '@/components/PlanetCelebrationOverlay';

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


function PlanetPageContent({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId  = searchParams.get('classId');
  const langParam = searchParams.get('lang');
  const [planet, setPlanet]           = useState<Planet | null>(null);
  const [loading, setLoading]         = useState(true);
  const [loadFailed, setLoadFailed]   = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [missionLang, setMissionLang] = useState<Lang>(langParam === 'he' ? 'he' : 'en');
  const [isAvatarThinking, setIsAvatarThinking] = useState(false);
  const { triggerReward } = useCoinReward();
  const [shownMsgCount, setShownMsgCount] = useState(0);
  const [baseAvatarUrl] = useState(() => loadStudent()?.baseAvatarUrl ?? null);
  const thinkingStartTime = useRef(0);
  const processedMsgCount = useRef(0);
  const isThinkingRef = useRef(false);
  const [firstName, setFirstName] = useState('');
  useEffect(() => { setFirstName(getFirstName()); }, []);
  const orin = useOrinChat('planet_screen', params.id, 'planet', missionLang);
  const planetVoice = usePlanetVoice(params.id, missionLang);
  const [savedInsights, setSavedInsights]         = useState<SummaryInsight[]>([]);
  const [savedIntroducedTerms, setSavedIntroducedTerms] = useState<MissionTerm[]>([]);
  const [showSummaryReview, setShowSummaryReview] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationAward, setCelebrationAward] = useState<{ amount: number; newBalance: number } | null>(null);
  const [celebrationNextPlanet, setCelebrationNextPlanet] = useState<NextPlanetInfo | null>(null);
  const [celebrationProgress, setCelebrationProgress] = useState<MissionProgressInfo | null>(null);
  const [celebrationVariant, setCelebrationVariant] = useState<'planet' | 'mission'>('planet');
  const chatPanelRef = useRef<HTMLElement>(null);

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

  // Show the reward modal when the bot awards coins server-side.
  // The award itself is now durable (written to coin_reward_log by the bot route),
  // so the client just needs to display the modal when a new award arrives.
  //
  // The popup is deliberately held back until the student has had time to read
  // the figure's acknowledgment line — otherwise it renders in the same paint as
  // the bot's message and the "wait for the bot" fix is invisible in practice.
  // Delay scales with that message's length, same formula as the Orin reveal above.
  useEffect(() => {
    const award = planetVoice.coinAward;
    if (!award?.awarded) return;

    const lastFigureMsg = [...planetVoice.messages].reverse().find(m => m.speaker === 'figure');
    const readDelay = Math.min(3200, 1400 + (lastFigureMsg?.content.length ?? 0) * 18);

    const timer = setTimeout(() => {
      const isFinalGoal = planetVoice.completionReady;
      const isGoalCompletion = award.eventType === 'goal_completion';
      // When the final goal and planet_complete fire in the same turn, mergeAwards
      // promotes the combined popup to the highest tier — 'mission_complete' when
      // this was the last planet in the mission. All three shapes must open the
      // celebration chain.
      const triggersCelebration =
        award.eventType === 'planet_complete' ||
        award.eventType === 'mission_complete' ||
        (isGoalCompletion && isFinalGoal);
      // Anchor the entrance animation to the chat panel — the student's message and
      // the bot's acknowledgment live there, so the reward should visibly emerge from
      // that conversation rather than materialize out of nowhere at screen center.
      if (triggersCelebration) {
        // Bypass CoinRewardModal — open the 3-beat overlay directly. Mission
        // completion gets the mission-flavored variant (routes home at Beat 3).
        handleCelebrationTrigger(
          { amount: award.amount, newBalance: award.newBalance },
          award.eventType === 'mission_complete' ? 'mission' : 'planet',
        );
      } else {
        triggerReward({
          awarded:          true,
          amount:           award.amount,
          newBalance:       award.newBalance,
          sourceRect:       chatPanelRef.current?.getBoundingClientRect(),
          eventType:        award.eventType as 'goal_completion' | 'first_vote' | 'planet_complete' | 'mission_complete' | 'bonus_mission',
          titleOverride:    isGoalCompletion ? t('goalReached', missionLang) : undefined,
          subtitleOverride: isGoalCompletion
            ? (award.goalDescription || t('keepExploringUniverse', missionLang))
            : undefined,
        });
      }
    }, readDelay);

    return () => clearTimeout(timer);
  }, [planetVoice.coinAward, planetVoice.completionReady, triggerReward]);

  function handleSend() {
    if (!orin.input.trim() || isAvatarThinking) return;
    setIsAvatarThinking(true);
    thinkingStartTime.current = Date.now();
    orin.send();
  }

  useEffect(() => {
    setLoadFailed(false);
    setLoading(true);
    fetch(`/api/student/mission?planetId=${params.id}${classId ? `&classId=${classId}` : ''}`)
      .then(r => {
        // Expired session must go back to sign-in, not a "planet not found" dead end.
        if (r.status === 401 || r.status === 403) { router.replace('/'); return null; }
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(data => {
        if (!data) return; // redirected
        const { planet } = data;
        setPlanet(planet);
        setMissionLang(planet?.missionLanguage === 'he' ? 'he' : 'en');
        setLoading(false);
      })
      .catch(() => {
        // Transient failure (offline, 500) — offer retry instead of "not found".
        setLoadFailed(true);
        setLoading(false);
      });
  }, [params.id, classId, router, loadAttempt]);

  async function preloadInsights() {
    try {
      const summaryRes = await fetch(`/api/student/planet-summaries?lang=${missionLang}`);
      const summaryData = await summaryRes.json();
      const match = (summaryData.summaries ?? []).find(
        (s: { planetId: string }) => s.planetId === params.id,
      );

      // The hook's summaryInsights are re-generated live by the history endpoint
      // using the current mission language — always correct even if the stored
      // planet_summary_goals rows were written in a different language (e.g. when
      // a teacher later changed the mission language from Hebrew to English).
      // Prefer those; fall back to DB rows only if the hook hasn't loaded them yet.
      const hookInsights = planetVoice.summaryInsights;
      const dbInsights: { termName?: string; insightText: string; studentAddition: string | null }[] =
        match?.insights ?? [];
      const insights = hookInsights.length > 0
        ? hookInsights.map((h, i) => ({
            goalSlug:        h.goalSlug,
            termName:        h.termName,
            insightText:     h.insightText,
            evidence:        h.evidence ?? '',
            // Layer in any student edits that were persisted to the DB row.
            studentAddition: dbInsights[i]?.studentAddition ?? undefined,
          }))
        : dbInsights.map((g) => ({
            goalSlug:        '',
            termName:        g.termName,
            insightText:     g.insightText,
            evidence:        '',
            studentAddition: g.studentAddition ?? undefined,
          }));
      setSavedInsights(insights);

      const termDefinitions = match?.termDefinitions ?? [];
      setSavedIntroducedTerms(termDefinitions);

      // The planet hasn't reached full completion yet (no planet_summaries row,
      // so no persisted term_definitions) — fetch a live, unpersisted preview
      // of terms introduced so far, the same way goal insights are already
      // visible before the planet is locked in.
      if (termDefinitions.length === 0) {
        const studentId = await getSessionStudentId();
        if (studentId) {
          const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL ?? 'https://astorli-bot.vercel.app';
          const termsRes = await fetch(
            `${BOT_URL}/api/planet-voice/terms?studentId=${studentId}&planetId=${params.id}&language=${missionLang}`,
          );
          const termsData = await termsRes.json();
          setSavedIntroducedTerms(termsData.terms ?? []);
        }
      }
    } catch {
      setSavedInsights([]);
      setSavedIntroducedTerms([]);
    }
  }

  async function handleViewDiscovery() {
    await preloadInsights();
    setShowSummaryReview(true);
  }

  async function handleCelebrationTrigger(
    award: { amount: number; newBalance: number },
    variant: 'planet' | 'mission' = 'planet',
  ) {
    const [, nextData] = await Promise.all([
      preloadInsights(),
      fetch(`/api/student/planet-next?planetId=${params.id}${classId ? `&classId=${classId}` : ''}`)
        .then(r => r.json())
        .catch(() => ({ nextPlanet: null, missionProgress: null })),
    ]);
    setCelebrationVariant(variant);
    setCelebrationAward(award);
    setCelebrationNextPlanet((nextData as { nextPlanet?: NextPlanetInfo }).nextPlanet ?? null);
    setCelebrationProgress(
      (nextData as { missionProgress?: MissionProgressInfo }).missionProgress
        ?? { completed: 1, total: 1, justCompletedIndex: 0 },
    );
    setShowCelebration(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-5 h-5 rounded-full border-2 border-[#a855f7]/30 border-t-[#00C4CC] animate-spin" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div style={{ fontSize: 38 }}>📡</div>
          <p className="text-white/40 font-space text-sm mt-3 mb-4">{t('mapLoadError', missionLang)}</p>
          <button
            onClick={() => setLoadAttempt(a => a + 1)}
            className="px-6 py-2.5 rounded-xl font-space text-xs tracking-[0.14em] uppercase"
            style={{
              border: '1px solid rgba(120,180,255,0.4)',
              background: 'rgba(120,180,255,0.1)',
              color: '#9ec1ff',
              cursor: 'pointer',
            }}
          >
            {t('tryAgain', missionLang)}
          </button>
          <div className="mt-3">
            <button onClick={() => router.push(classId ? `/landscape?classId=${classId}` : '/landscape')} className="btn-ghost font-space text-xs">
              {t('backToLandscape', missionLang)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!planet) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 font-space text-sm mb-4">{t('planetNotFound', missionLang)}</p>
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
  const ce = t('ceSuffix', missionLang);
  const figureEra         = character?.era
    ?? (planet.characterYear && figureLocation
          ? `${figureLocation} · ${planet.characterYear} ${ce}`
          : planet.characterYear ? `${planet.characterYear} ${ce}`
          : experience?.year && figureLocation
            ? `${figureLocation} · ${experience.year} ${ce}`
            : experience?.year ? `${experience.year} ${ce}` : null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative h-screen bg-black overflow-hidden flex flex-col"
    >
      <StarField count={60} seed={params.id.length * 7} />

      <TopBar
        backToMap={classId ? `/landscape?classId=${classId}` : '/landscape'}
        center={figureDisplayName ? (
          <span className="text-[10px] tracking-wide text-[#a855f7]/60 font-space flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] inline-block" />
            {figureDisplayName} {t('isPresenting', missionLang)}
          </span>
        ) : undefined}
        showStore
        initials={firstName[0]?.toUpperCase() ?? 'A'}
        lang={missionLang}
      />

      {/* Main content row */}
      <div className="flex flex-1 pt-11 overflow-hidden min-h-0">

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
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a855f7] opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#a855f7]" />
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
              src={character.listening_video_url}
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
              {figureEra ? `${t('temporalLink', missionLang)} · ${figureEra}` : `${t('planetLabel', missionLang)} · ${label.toUpperCase()}`}
            </span>
            <button
              onClick={() => router.push(classId ? `/landscape?classId=${classId}` : '/landscape')}
              className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] font-space text-white/30 hover:text-white/60 transition-colors uppercase"
            >
              {t('backToLandscape', missionLang)}
            </button>
          </div>
        </div>

        {/* ── Right — Chat + Notebook panel ── */}
        <aside ref={chatPanelRef} className="panel w-[380px] flex-shrink-0 flex flex-col overflow-hidden" style={{ position: 'relative' }}>
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
                <span className="w-4 h-4 rounded-full border-2 border-[#a855f7]/30 border-t-[#00C4CC] animate-spin" />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[11px] text-white/30 font-space">{t(planetVoice.charError ? 'characterLoadFailed' : 'noCharacterAvailable', missionLang)}</p>
              </div>
            )}

          </div>

        </aside>
      </div>

      {/* Planet Summary Screen — full-screen overlay. Opens automatically once
          the avatar celebration is dismissed (fresh completion), and reopens
          on demand via the "what did I discover" button (handleViewDiscovery). */}
      <AnimatePresence>
        {showSummaryReview && (
          <PlanetSummaryScreen
            insights={savedInsights}
            onDismiss={() => setShowSummaryReview(false)}
            language={missionLang}
            introducedTerms={savedIntroducedTerms}
            planetName={label}
          />
        )}
      </AnimatePresence>

      {/* ── Planet completion celebration overlay (3-beat) ────────────── */}
      {showCelebration && celebrationAward && celebrationProgress && (
        <PlanetCelebrationOverlay
          award={celebrationAward}
          planetName={planet?.label ?? planet?.title ?? ''}
          orinVideoUrl={baseAvatarUrl?.replace('.png', '.mp4') ?? '/avatars/base/base-03.mp4'}
          insights={savedInsights}
          introducedTerms={savedIntroducedTerms}
          nextPlanet={celebrationNextPlanet}
          missionProgress={celebrationProgress}
          language={missionLang}
          classId={classId ?? undefined}
          variant={celebrationVariant}
          onClose={() => setShowCelebration(false)}
        />
      )}

    </motion.div>
  );
}

export default function PlanetPage({ params }: { params: { id: string } }) {
  return (
    <Suspense>
      <PlanetPageContent params={params} />
    </Suspense>
  );
}
