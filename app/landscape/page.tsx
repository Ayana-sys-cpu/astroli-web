'use client';
import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import TopBar from '@/components/TopBar';
import OrinOrb from '@/components/OrinOrb';
import { t } from '@/lib/i18n';
import Planet from '@/components/Planet';
import MissionOverlay from '@/components/MissionOverlay';
import PipGuidePanel from '@/components/PipGuidePanel';
import { getBotName, loadStudent } from '@/lib/student-store';
import { getPlanetMeta, PLANET_LAYOUT, PLANET_EDGES } from '@/lib/planet-meta';

interface Planet {
  id: string;
  title: string;
  label: string | null;
  shortTitle: string | null;
  planetQuestion: string | null;
  content: string;
  openingMessage: string | null;
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

  const [orinOpen, setOrinOpen] = useState(true);
  const [botName, setBotName]   = useState('');
  const [mission, setMission]   = useState<Mission | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [ready, setReady]             = useState(false);
  const [baseAvatarUrl, setBaseAvatarUrl] = useState<string | null>(null);
  const [planetProgress, setPlanetProgress] = useState<Record<string, { goalsDiscovered: number; totalGoals: number; completed: boolean }>>({});
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
    fetch(`/api/student/journey${classId ? `?classId=${classId}` : ''}`)
      .then(r => r.json())
      .then(({ hasActiveJourney, hasActiveVote, activeMissionId, missionStatus }) => {
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
        if (activeMissionId) {
          fetch(`/api/student/mission?missionId=${activeMissionId}`)
            .then(r => r.json())
            .then(({ mission }) => {
              if (!missionStatus) {
                isFirstVisit.current = true;
                setShowOverlay(true);
              } else {
                setReady(true);
              }
              setMission(mission);
              fetch(`/api/student/planet-progress?missionId=${mission.id}`)
                .then(r => r.json())
                .then(({ progress }) => { if (progress) setPlanetProgress(progress); })
                .catch(() => {});
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [isPreview, router, classId]);

  const handleAcceptMission = () => {
    setShowOverlay(false);
    setReady(true);
    if (mission && !isPreview) {
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
  const missionLabel = mission ? `MISSION ${String(mission.order).padStart(2, '0')}` : '…';
  const bigIdea      = mission?.question ?? '';

  // First planet passed to PipGuidePanel for the "Start Here" card navigation
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

      {/* Mission overlay — first visit only */}
      <AnimatePresence>
        {showOverlay && mission && (
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

            <TopBar left={`${missionLabel} · ${bigIdea.toUpperCase()}`} showHome={!isPreview} />

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
                    onClick={isPreview ? () => {} : () => router.push(`/landscape/${p.id}${classId ? `?classId=${classId}` : ''}`)}
                  />
                ))}
              </div>

              {/* ── Right: Pip guide panel ────────────────────────────────── */}
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
                          {botName.toUpperCase()} · GUIDE
                        </p>
                      </div>
                      <button
                        onClick={() => setOrinOpen(false)}
                        className="text-white/18 hover:text-white/60 transition-colors text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>

                    {/* Pip guide content — replaces old Orin chat */}
                    <PipGuidePanel
                      missionId={mission?.id}
                      missionOrder={mission?.order ?? 1}
                      firstPlanet={firstPlanet}
                      onLaunch={() => setOrinOpen(false)}
                      language={mission?.language}
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
                  title={`Talk to ${botName}`}
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
