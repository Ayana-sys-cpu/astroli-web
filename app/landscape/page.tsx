'use client';
import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import TopBar from '@/components/TopBar';
import OrinOrb from '@/components/OrinOrb';
import { t } from '@/lib/i18n';
import Planet from '@/components/Planet';
import dynamic from 'next/dynamic';
import MissionOverlay from '@/components/MissionOverlay';
// Heavy guide panel (~1000 lines) — only mounts when the teacher-guide sidebar
// is opened, so it's split out of this page's first-load bundle.
const OrinGuidePanel = dynamic(() => import('@/components/OrinGuidePanel'), { ssr: false });
import { getBotName, loadStudent } from '@/lib/student-store';
import { getPlanetMeta, PLANET_LAYOUT, PLANET_EDGES } from '@/lib/planet-meta';
import type { OrinMission } from '@/lib/orin-guide-types';
import type { MissionStatePayload } from '@/components/OrinGuidePanel';

interface Planet {
  id: string;
  title: string;
  label: string | null;
  shortTitle: string | null;
  planetQuestion: string | null;
}

interface Mission {
  id: string;
  question: string;
  order: number;
  language:             'en' | 'he';
  openingMessage:       string | null;
  questionDescription:  string | null;
  projectTitle:         string | null;
  projectDescription:   string | null;
  planets: Planet[];
}

function LandscapeContent() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const previewId     = searchParams.get('preview'); // teacher preview mode
  const isPreview     = Boolean(previewId);
  const classId       = searchParams.get('classId');

  const reviewMissionId = searchParams.get('reviewMissionId');
  const isReview        = Boolean(reviewMissionId);

  const [orinOpen, setOrinOpen] = useState(true);
  const [botName, setBotName]   = useState('');
  const [mission, setMission]   = useState<Mission | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [ready, setReady]             = useState(false);
  const [baseAvatarUrl, setBaseAvatarUrl] = useState<string | null>(null);
  const [planetProgress, setPlanetProgress] = useState<Record<string, { goalsDiscovered: number; totalGoals: number; completed: boolean }>>({});
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  // Pre-fetched for OrinGuidePanel — null = loading (panel waits without self-fetching)
  const [orinMission, setOrinMission] = useState<OrinMission | null>(null);
  const [initialMissionState, setInitialMissionState] = useState<MissionStatePayload | null>(null);
  const isFirstVisit = useRef(false);

  useEffect(() => {
    setBotName(getBotName());
    setBaseAvatarUrl(loadStudent()?.baseAvatarUrl ?? null);
  }, []);

  // Teacher preview mode — fetch via teacher API, skip student session.
  useEffect(() => {
    if (!isPreview || !previewId) return;
    fetch(`/api/teacher/missions?id=${previewId}`)
      .then(r => r.json())
      .then(({ mission }) => {
        if (mission) {
          setMission(mission);
          setShowOverlay(true);
        }
      })
      .catch(() => {});
  }, [isPreview, previewId]);

  // Student normal mode — fetch via student session.
  useEffect(() => {
    if (isPreview) return;
    setLoadError(false);

    // ── Review mode: load a specific past mission without the journey check ──
    if (isReview) {
      if (!reviewMissionId || !classId) { router.replace('/home'); return; }
      (async () => {
        try {
          const missionRes = await fetch(`/api/student/mission?missionId=${reviewMissionId}&classId=${classId}`);
          if (!missionRes.ok) { router.replace('/home'); return; }
          const { mission } = await missionRes.json();
          if (!mission) { router.replace('/home'); return; }

          const progressRes = await fetch(`/api/student/planet-progress?missionId=${reviewMissionId}`);
          const { progress } = await progressRes.json().catch(() => ({ progress: null }));

          setMission(mission);
          if (progress) setPlanetProgress(progress);
          setReady(true); // no overlay in review mode
        } catch {
          router.replace('/home');
        }
      })();
      return;
    }

    // ── Normal mode ──────────────────────────────────────────────────────────
    (async () => {
      try {
        const journeyRes = await fetch(`/api/student/journey${classId ? `?classId=${classId}` : ''}`);
        const { hasActiveJourney, hasActiveVote, activeMissionId, missionStatus } = await journeyRes.json();

        if (!hasActiveJourney) {
          if (hasActiveVote) {
            // No classId means this came from a caller that never had one
            // (onboarding, pip-guide) — preserve the old direct-to-vote hop
            // for that case; otherwise this is a real mismatch on a known
            // class (e.g. mission was reset), so keep the classId scoping.
            router.replace(classId ? `/vote?classId=${classId}` : '/vote');
          } else {
            // No active vote either — bounce to the hub rather than the old
            // single-journey /pending-journey, since other journeys may
            // still need attention.
            router.replace('/home');
          }
          return;
        }
        if (!activeMissionId) {
          // Journey is active but no mission has started — the hub is the only
          // sensible destination; staying here would strand the student on a
          // blank starfield.
          router.replace('/home');
          return;
        }

        // All three only need activeMissionId — fetch concurrently so none
        // waits on the others.  mission-state would otherwise be tier 3 (fetched
        // by OrinGuidePanel on mount); pulling it up here removes that round-trip
        // from the panel's critical path.
        const [missionRes, progressRes, stateRes] = await Promise.all([
          fetch(`/api/student/mission?missionId=${activeMissionId}${classId ? `&classId=${classId}` : ''}`),
          fetch(`/api/student/planet-progress?missionId=${activeMissionId}`),
          fetch(`/api/student/mission-state?missionId=${activeMissionId}`),
        ]);
        const { mission } = await missionRes.json();
        const { progress } = await progressRes.json().catch(() => ({ progress: null }));
        const statePayload: MissionStatePayload | null = await stateRes.json().catch(() => null);

        if (!mission) {
          // 404/500 body without a mission — never reveal an empty map.
          setLoadError(true);
          return;
        }
        if (!missionStatus) {
          isFirstVisit.current = true;
          setShowOverlay(true);
        }
        setMission(mission);
        if (progress) setPlanetProgress(progress);
        setInitialMissionState(statePayload);
        if (missionStatus) setReady(true);

        // Tier 3: guide content for OrinGuidePanel.  Needs the resolved language
        // from tier 2 (class language may differ from mission.language).  This
        // endpoint is publicly CDN-cached so it resolves fast.
        try {
          const orinRes = await fetch(`/api/mission?missionId=${activeMissionId}&lang=${mission.language}`);
          const orinData: OrinMission = await orinRes.json();
          setOrinMission(orinData);
        } catch {
          // Panel falls back to its loading state; a retry isn't needed since
          // /api/mission is cached and failures are transient.
        }
      } catch {
        setLoadError(true);
      }
    })();
  }, [isPreview, isReview, reviewMissionId, router, classId, loadAttempt]);

  const handleAcceptMission = () => {
    setShowOverlay(false);
    setReady(true);
    if (mission && !isPreview && !isReview) {
      // studentId comes from the server session — not sent in the body.
      fetch('/api/student/journey', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId: mission.id, status: 'started' }),
      }).catch(() => {});
    }
  };

  const planets = (mission?.planets ?? []).map((p, i) => {
    const meta     = getPlanetMeta(p.title);
    const label    = p.label ?? meta.label;
    const pos      = PLANET_LAYOUT[i] ?? { x: 50, y: 50 };
    const progress = planetProgress[p.id];
    return {
      id: p.id,
      name: label,
      label,
      shortTitle:     (p.shortTitle ?? label).trim(),
      planetQuestion: p.planetQuestion && p.planetQuestion.trim() !== '|||'
        ? p.planetQuestion.trim()
        : meta.question || null,
      number: String(i + 1).padStart(2, '0'),
      ...pos,
      explored:        progress?.completed ?? false,
      goalsDiscovered: progress?.goalsDiscovered ?? 0,
      totalGoals:      progress?.totalGoals ?? 0,
    };
  });

  const edges        = PLANET_EDGES[planets.length] ?? [];
  const uiLang       = mission?.language === 'he' ? 'he' as const : 'en' as const;
  const missionLabel = mission ? `${t('missionLabel', uiLang)} ${String(mission.order).padStart(2, '0')}` : '…';
  const bigIdea      = mission?.question ?? '';

  // First planet passed to OrinGuidePanel for the "Start Here" card navigation
  const firstPlanet = planets[0]
    ? { id: planets[0].id, label: planets[0].label }
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative min-h-screen bg-black overflow-hidden flex flex-col"
    >
      <StarField count={130} seed={55} />

      {/* Loading / error states — never strand the student on a bare starfield */}
      {!ready && !showOverlay && (
        loadError ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5">
            <div style={{ fontSize: 38 }}>📡</div>
            <p className="text-[12px] tracking-[0.2em] font-space uppercase text-white/50 text-center px-8">
              {t('mapLoadError', uiLang)}
            </p>
            <button
              onClick={() => setLoadAttempt(a => a + 1)}
              className="px-6 py-2.5 rounded-xl font-space text-[12px] tracking-[0.14em] uppercase"
              style={{
                border: '1px solid rgba(120,180,255,0.4)',
                background: 'rgba(120,180,255,0.1)',
                color: '#9ec1ff',
                cursor: 'pointer',
              }}
            >
              {t('tryAgain', uiLang)}
            </button>
            <button
              onClick={() => router.push('/home')}
              className="text-[11px] font-space tracking-[0.2em] uppercase underline underline-offset-4"
              style={{ color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}
            >
              {t('backToHome', uiLang)}
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="text-[10px] tracking-[0.3em] font-space uppercase text-white/40"
            >
              {t('syncingShort', uiLang)}
            </motion.div>
          </div>
        )
      )}

      {/* Mission overlay — first visit only, never in review mode */}
      <AnimatePresence>
        {showOverlay && !isReview && mission && (
          <MissionOverlay
            question={mission.question}
            order={mission.order}
            onAccept={handleAcceptMission}
            language={mission.language}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ready && (
          <motion.div
            key="landscape-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex flex-col"
          >
            {/* Constellation lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" aria-hidden>
              {edges.map(([a, b], i) => (
                <motion.line
                  key={i}
                  x1={`${planets[a]?.x ?? 0}%`} y1={`${planets[a]?.y ?? 0}%`}
                  x2={`${planets[b]?.x ?? 0}%`} y2={`${planets[b]?.y ?? 0}%`}
                  stroke="rgba(0,245,212,0.1)"
                  strokeWidth="0.7"
                  strokeDasharray="4 6"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 1 + i * 0.2, duration: 0.8 }}
                />
              ))}
            </svg>

            <TopBar left={`${missionLabel} · ${bigIdea.toUpperCase()}`} showHome={!isPreview} showStore={!isPreview} lang={uiLang} />

            {/* Review-mode indicator */}
            {isReview && (
              <div
                style={{
                  position: 'absolute', top: 56, left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 60,
                  background: 'rgba(123,47,190,0.18)',
                  border: '1px solid rgba(123,47,190,0.35)',
                  borderRadius: 16,
                  backdropFilter: 'blur(10px)',
                  padding: '8px 18px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(205,155,255,0.85)', letterSpacing: '0.14em' }}>
                  {t('reviewModeBanner', uiLang)}
                </span>
                <button
                  onClick={() => router.push('/home')}
                  style={{
                    padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(205,155,255,0.35)',
                    background: 'transparent', color: 'rgba(205,155,255,0.85)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {t('back', uiLang)}
                </button>
              </div>
            )}

            {/* Preview mode banner */}
            {isPreview && (
              <div
                className="absolute top-14 left-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  transform: 'translateX(-50%)',
                  background: 'rgba(139,0,255,0.18)',
                  border: '1px solid rgba(139,0,255,0.35)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#8B00FF' }} />
                <span className="font-space text-[9px] tracking-[0.18em]" style={{ color: 'rgba(232,232,240,0.7)' }}>
                  {t('teacherPreviewBanner', mission?.language ?? 'en')}
                </span>
                <button
                  onClick={() => router.back()}
                  className="ml-2 font-space text-[9px] tracking-[0.12em] hover:opacity-100 transition-opacity"
                  style={{ color: 'rgba(232,232,240,0.5)' }}
                >
                  {t('back', mission?.language ?? 'en')}
                </button>
              </div>
            )}

            {/* ── Main layout ─────────────────────────────────────────────── */}
            <div className="flex flex-1 pt-14 min-h-0 overflow-hidden">

              {/* ── Planet field ──────────────────────────────────────────── */}
              <div className="flex-1 relative">
                {planets.map((p) => (
                  <Planet
                    key={p.id}
                    {...p}
                    lang={mission?.language === 'he' ? 'he' : 'en'}
                    onClick={isPreview ? () => {} : () => router.push(`/landscape/${p.id}?lang=${uiLang}${classId ? `&classId=${classId}` : ''}`)}
                  />
                ))}
              </div>

              {/* ── Right: Orin guide panel ────────────────────────────────── */}
              <AnimatePresence>
                {orinOpen && (
                  <motion.aside
                    key="orin-panel"
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 300, opacity: 0 }}
                    transition={{ delay: 0.4, type: 'spring', damping: 24, stiffness: 180 }}
                    className="panel w-[290px] flex-shrink-0 flex flex-col overflow-hidden min-h-0"
                  >
                    {/* Panel header — unchanged */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
                      <div className="flex items-center gap-2.5">
                        {baseAvatarUrl
                          ? <motion.img
                              src={baseAvatarUrl}
                              alt={botName}
                              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                              style={{ border: '1px solid rgba(0,245,212,0.4)', boxShadow: '0 0 8px rgba(0,245,212,0.3)' }}
                            />
                          : <OrinOrb size={28} />}
                        <p className="text-[9px] tracking-[0.2em] text-[#00F5D4]/60 font-space uppercase">
                          {botName.toUpperCase()} · {t('guideLabel', uiLang)}
                        </p>
                      </div>
                      <button
                        onClick={() => setOrinOpen(false)}
                        className="text-white/18 hover:text-white/60 transition-colors text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>

                    {/* Orin guide content */}
                    <OrinGuidePanel
                      missionId={mission?.id}
                      missionOrder={mission?.order ?? 1}
                      firstPlanet={firstPlanet}
                      onLaunch={() => setOrinOpen(false)}
                      language={mission?.language}
                      orinMission={orinMission}
                      initialMissionState={initialMissionState}
                    />
                  </motion.aside>
                )}
              </AnimatePresence>

              {/* Floating avatar button — opens sidebar */}
              {!orinOpen && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setOrinOpen(true)}
                  className="absolute bottom-24 right-6 z-30 w-12 h-12 rounded-full overflow-hidden flex-shrink-0 hover:scale-110 transition-transform"
                  style={baseAvatarUrl ? {
                    border: '1px solid rgba(0,245,212,0.5)',
                    boxShadow: '0 0 20px rgba(0,245,212,0.4)',
                  } : {}}
                  title={t('talkTo', uiLang).replace('{name}', botName)}
                >
                  {baseAvatarUrl
                    ? <img src={baseAvatarUrl} alt={botName} className="w-full h-full object-cover" />
                    : <OrinOrb size={48} pulse />}
                </motion.button>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

export default function LandscapePage() {
  return (
    <Suspense>
      <LandscapeContent />
    </Suspense>
  );
}
