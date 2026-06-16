'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useSupabaseRealtime, type RealtimeMission, type RealtimeVote } from '@/hooks/useSupabaseRealtime';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getCourses, saveCourses, type CourseRecord } from '@/lib/teacher-store';
import ConnectState from '@/components/teacher/ConnectState';
import { toDatetimeLocal } from '@/lib/vote-utils';
import Countdown from '@/components/Countdown';
import StudentMobilePreview from '@/components/StudentMobilePreview';
import VoteManageModals from '@/components/VoteManageModals';
import JourneyMonitorView from '@/components/teacher/journey/JourneyMonitorView';

type MissionState = 'locked' | 'voting' | 'pending_start' | 'active' | 'completed' | 'skipped';

interface Planet {
  id: string;
  title: string;
  content: string;
}

interface Mission {
  id: string;
  question: string;
  questionDescription?: string | null;
  projectTitle: string;
  projectDescription?: string | null;
  state: MissionState;
  order: number;
  planets?: Planet[];
}

interface Journey {
  id: string;
  title: string;
  googleCourseId: string;
  missions: Mission[];
  activeVoteSession: { id: string; endsAt: string } | null;
}

const STATUS_STYLES: Record<MissionState, { label: string; color: string; bg: string; dot: string }> = {
  locked:        { label: 'LOCKED',   color: 'rgba(26,26,46,0.3)',   bg: 'rgba(26,26,46,0.04)',    dot: 'rgba(26,26,46,0.2)' },
  voting:        { label: 'VOTING',   color: '#8B00FF',               bg: 'rgba(139,0,255,0.08)',   dot: '#8B00FF' },
  pending_start: { label: 'PENDING',  color: '#B45309',               bg: 'rgba(245,158,11,0.08)',  dot: '#F59E0B' },
  active:        { label: 'LIVE',     color: '#0369A1',               bg: 'rgba(14,165,233,0.08)',  dot: '#0EA5E9' },
  completed:     { label: 'COMPLETE', color: '#059669',               bg: 'rgba(16,185,129,0.08)',  dot: '#10B981' },
  skipped:       { label: 'SKIPPED',  color: 'rgba(26,26,46,0.2)',   bg: 'rgba(26,26,46,0.02)',    dot: 'rgba(26,26,46,0.1)' },
};


function JourneySync({
  journeyId,
  onMissionStateChange,
  onVoteCast,
}: {
  journeyId: string;
  onMissionStateChange: (m: RealtimeMission) => void;
  onVoteCast: (v: RealtimeVote) => void;
}) {
  useSupabaseRealtime({ journeyId, onMissionStateChange, onVoteCast });
  return null;
}

export default function JourneyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [journeys,     setJourneys]     = useState<Journey[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [activating,   setActivating]   = useState<string | null>(null);
  const [courses,      setCourses]      = useState<CourseRecord[]>([]);
  const [fullMissions, setFullMissions] = useState<Record<string, Mission[]>>({});
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [studentView,  setStudentView]  = useState<Mission | null>(null);
  const [voteStart,    setVoteStart]    = useState(() => toDatetimeLocal(new Date()));
  const [voteEnd,      setVoteEnd]      = useState(() => toDatetimeLocal(new Date(Date.now() + 48 * 60 * 60 * 1000)));
  const [starting,     setStarting]     = useState(false);
  const [voteActiveMap,  setVoteActiveMap]  = useState<Record<string, string>>({});
  // Maps journeyId → sessionId for API calls (vote-counts, winner).
  // Persists after conclusion so results remain visible on the dashboard.
  const [voteSessionMap, setVoteSessionMap] = useState<Record<string, string>>({});
  const [voteCounts,     setVoteCounts]     = useState<Record<string, Record<string, number>>>({});
  const [copiedId,      setCopiedId]      = useState<string | null>(null);
  const syncedVoteRef = useRef(false);

  // Teacher manage-vote modals
  const [editVoteJourneyId,   setEditVoteJourneyId]   = useState<string | null>(null);
  const [editVoteEnd,         setEditVoteEnd]          = useState('');
  const [finishConfirmId,     setFinishConfirmId]      = useState<string | null>(null);
  const [deleteConfirmId,     setDeleteConfirmId]      = useState<string | null>(null);
  const [manageLoading,       setManageLoading]        = useState(false);

  const fetchVoteCounts = (journeyId: string, sessionId: string) => {
    fetch(`/api/vote-counts?voteSessionId=${sessionId}`)
      .then(r => r.json())
      .then(d => {
        if (d.counts) setVoteCounts(prev => ({ ...prev, [journeyId]: d.counts }));
      })
      .catch(() => {});
  };

  const fetchJourneys = () => {
    setLoading(true);
    // teacherId comes from the server session — not passed in the URL.
    fetch('/api/teacher/journeys')
      .then(r => {
        if (r.status === 401) { router.replace('/'); return { journeys: [] }; }
        if (!r.ok) { console.error('[fetchJourneys] error', r.status); return { journeys: [] }; }
        return r.json();
      })
      .then(d => {
        const loaded: Journey[] = d.journeys ?? [];
        setJourneys(loaded);
        setLoading(false);

        // Populate voteActiveMap and voteSessionMap from server-provided session data.
        loaded.forEach(journey => {
          if (journey.activeVoteSession) {
            setVoteActiveMap(prev => ({ ...prev, [journey.id]: journey.activeVoteSession!.endsAt }));
            setVoteSessionMap(prev => ({ ...prev, [journey.id]: journey.activeVoteSession!.id }));
            localStorage.setItem(`voteEnd_${journey.id}`, journey.activeVoteSession.endsAt);
            localStorage.setItem(`voteSessionId_${journey.id}`, journey.activeVoteSession.id);
          } else {
            // No active session — restore concluded session ID from localStorage for results display.
            const storedSessionId = localStorage.getItem(`voteSessionId_${journey.id}`);
            if (storedSessionId) {
              setVoteSessionMap(prev => ({ ...prev, [journey.id]: storedSessionId }));
            }
          }
        });

        loaded.forEach(journey => {
          fetch(`/api/teacher/missions?journeyId=${journey.id}`)
            .then(r => r.json())
            .then(md => {
              const ms: Mission[] = md.missions ?? [];
              setFullMissions(prev => ({ ...prev, [journey.id]: ms }));
              const hasConcluded = ms.some(m => m.state === 'pending_start' || m.state === 'skipped');
              const sessionId = journey.activeVoteSession?.id ?? localStorage.getItem(`voteSessionId_${journey.id}`);
              if (hasConcluded && sessionId) fetchVoteCounts(journey.id, sessionId);
            })
            .catch(() => {});
        });
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    const cached = getCourses();
    if (cached.length > 0) {
      setCourses(cached);
      fetchJourneys();
      return;
    }
    {
      // teacherId is read from the verified session on the server — not sent in the URL.
      fetch('/api/teacher/courses')
        .then(r => r.json())
        .then(d => {
          const fetched: CourseRecord[] = d.courses ?? [];
          setCourses(fetched);
          if (fetched.length > 0) saveCourses(fetched);
        })
        .catch(() => {});
    }
    fetchJourneys();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On first load, clean up any missions stuck in 'voting' state that have no
  // corresponding open session in the DB (e.g. server restarted mid-vote).
  // The server is now the source of truth for active sessions — no localStorage→DB sync needed.
  useEffect(() => {
    if (journeys.length === 0 || syncedVoteRef.current) return;
    const allLoaded = journeys.every(j => Boolean(fullMissions[j.id]));
    if (!allLoaded) return;
    syncedVoteRef.current = true;
    journeys.forEach(j => {
      if (!j.activeVoteSession) {
        const ms = fullMissions[j.id] ?? j.missions;
        const staleMissions = ms.filter(m => m.state === 'voting');
        staleMissions.forEach(m => {
          fetch('/api/teacher/missions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ journeyId: j.id, missionId: m.id, state: 'locked' }),
          }).catch(() => {});
        });
        localStorage.removeItem(`voteEnd_${j.id}`);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeys, fullMissions]);

  async function toggleMission(mission: Mission) {
    if (activating) return;
    // Only allow manual transitions for non-vote-controlled states
    const nextState: MissionState | null =
      mission.state === 'locked'        ? 'active' :
      mission.state === 'active'        ? 'completed' :
      mission.state === 'completed'     ? 'locked' :
      mission.state === 'pending_start' ? 'active' :
      null; // voting, skipped: controlled by vote system
    if (!nextState) return;
    setActivating(mission.id);
    try {
      const r = await fetch('/api/teacher/missions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId: params.id, missionId: mission.id, state: nextState }),
      });
      if (!r.ok) throw new Error('Server error');
      const update = (ms: Mission[]) => ms.map(m => m.id === mission.id ? { ...m, state: nextState } : m);
      setJourneys(prev => prev.map(j => ({ ...j, missions: update(j.missions) })));
      setFullMissions(prev => {
        const next: Record<string, Mission[]> = {};
        Object.entries(prev).forEach(([jid, ms]) => { next[jid] = update(ms); });
        return next;
      });
    } catch {
      // revert — state unchanged
    } finally {
      setActivating(null);
    }
  }

  async function startVote(journeyId: string, missions: Mission[]) {
    if (starting) return;
    // Voting gate: ≥2 non-completed/active/skipped missions, no active mission
    const votable   = missions.filter(m => !['completed', 'active', 'skipped'].includes(m.state));
    const hasActive = missions.some(m => m.state === 'active');
    if (votable.length < 2 || hasActive) return;
    setStarting(true);
    try {
      const startIso = new Date(voteStart).toISOString();
      const endIso   = new Date(voteEnd).toISOString();
      const res = await fetch('/api/teacher/journeys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId, voteStartsAt: startIso, voteEndsAt: endIso }),
      });
      if (!res.ok) return;
      const data = await res.json();
      localStorage.setItem(`voteEnd_${journeyId}`, endIso);
      setVoteActiveMap(prev => ({ ...prev, [journeyId]: endIso }));
      if (data.sessionId) {
        localStorage.setItem(`voteSessionId_${journeyId}`, data.sessionId);
        setVoteSessionMap(prev => ({ ...prev, [journeyId]: data.sessionId }));
      }
      const md = await fetch(`/api/teacher/missions?journeyId=${journeyId}`).then(r => r.json());
      const ms: Mission[] = md.missions ?? [];
      setFullMissions(prev => ({ ...prev, [journeyId]: ms }));
      setJourneys(prev => prev.map(j =>
        j.id === journeyId ? { ...j, missions: ms.map(m => ({ id: m.id, question: m.question, projectTitle: m.projectTitle, state: m.state, order: m.order })) } : j
      ));
    } finally {
      setStarting(false);
    }
  }

  async function handleUpdateVoteEnd(journeyId: string) {
    if (!editVoteEnd) return;
    setManageLoading(true);
    try {
      const endIso = new Date(editVoteEnd).toISOString();
      const res = await fetch('/api/teacher/journeys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId, voteEndsAt: endIso }),
      });
      if (!res.ok) return;
      localStorage.setItem(`voteEnd_${journeyId}`, endIso);
      setVoteActiveMap(prev => ({ ...prev, [journeyId]: endIso }));
      setEditVoteJourneyId(null);
    } finally {
      setManageLoading(false);
    }
  }

  async function handleFinishVote(journeyId: string) {
    setManageLoading(true);
    try {
      const sessionId = voteSessionMap[journeyId];
      const winnerRes = await fetch(`/api/winner?voteSessionId=${sessionId}`);
      const { winnerId } = await winnerRes.json();
      const ms = fullMissions[journeyId] ?? journeys.find(j => j.id === journeyId)?.missions ?? [];
      const votingMissions = ms.filter(m => m.state === 'voting');
      // If no votes were cast, pick the first mission by order as winner
      const resolvedWinnerId: string | null = winnerId ?? (votingMissions.sort((a, b) => a.order - b.order)[0]?.id ?? null);

      localStorage.removeItem(`voteEnd_${journeyId}`);
      setVoteActiveMap(prev => {
        const next = { ...prev };
        delete next[journeyId];
        return next;
      });

      await Promise.all([
        fetch('/api/teacher/journeys', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ journeyId, voteEndsAt: null }),
        }),
        ...votingMissions.map(m =>
          fetch('/api/teacher/missions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ journeyId, missionId: m.id, state: m.id === resolvedWinnerId ? 'pending_start' : 'skipped' }),
          })
        ),
      ]);

      const update = (missions: Mission[]) =>
        missions.map(m => {
          if (m.state !== 'voting') return m;
          return { ...m, state: (m.id === resolvedWinnerId ? 'pending_start' : 'skipped') as MissionState };
        });
      setJourneys(prev => prev.map(j => j.id === journeyId ? { ...j, missions: update(j.missions) } : j));
      setFullMissions(prev => {
        const next: Record<string, Mission[]> = {};
        Object.entries(prev).forEach(([jid, missions]) => { next[jid] = jid === journeyId ? update(missions) : missions; });
        return next;
      });

      // Fetch vote counts to display results on cards
      const sid = voteSessionMap[journeyId];
      if (sid) fetchVoteCounts(journeyId, sid);
      setFinishConfirmId(null);
    } finally {
      setManageLoading(false);
    }
  }

  async function handleDeleteVote(journeyId: string) {
    setManageLoading(true);
    try {
      localStorage.removeItem(`voteEnd_${journeyId}`);
      localStorage.removeItem(`voteSessionId_${journeyId}`);
      setVoteActiveMap(prev => {
        const next = { ...prev };
        delete next[journeyId];
        return next;
      });
      setVoteSessionMap(prev => {
        const next = { ...prev };
        delete next[journeyId];
        return next;
      });
      // Reset all voting missions back to locked
      const ms = fullMissions[journeyId] ?? journeys.find(j => j.id === journeyId)?.missions ?? [];
      await Promise.all([
        fetch('/api/teacher/journeys', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ journeyId, voteEndsAt: null }),
        }),
        ...ms.filter(m => m.state === 'voting').map(m =>
          fetch('/api/teacher/missions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ journeyId, missionId: m.id, state: 'locked' }),
          })
        ),
      ]);
      const update = (missions: Mission[]) =>
        missions.map(m => m.state === 'voting' ? { ...m, state: 'locked' as MissionState } : m);
      setJourneys(prev => prev.map(j => j.id === journeyId ? { ...j, missions: update(j.missions) } : j));
      setFullMissions(prev => {
        const next: Record<string, Mission[]> = {};
        Object.entries(prev).forEach(([jid, missions]) => { next[jid] = jid === journeyId ? update(missions) : missions; });
        return next;
      });
      setDeleteConfirmId(null);
    } finally {
      setManageLoading(false);
    }
  }

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">

      {loading ? (
        <div className="flex items-center gap-3 mt-24 justify-center">
          <span className="w-5 h-5 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
          <span className="font-space text-xs tracking-widest text-white/30">LOADING YOUR GOOGLE CLASSES…</span>
        </div>
      ) : journeys.length === 0 ? (
        <ConnectState courses={courses} onConnected={fetchJourneys} />
      ) : (
        <div className="flex flex-col gap-10">
          {!loading && journeys.length > 0 && journeys.filter(j => j.id === params.id).length === 0 && (
            <div className="p-8 text-white/40 font-space text-sm">Journey not found.</div>
          )}
          {journeys.filter(j => j.id === params.id).map((journey, ji) => {
            const missions        = fullMissions[journey.id] ?? journey.missions;
            const allLocked       = missions.every(m => m.state === 'locked');
            const voteIsLive      = Boolean(voteActiveMap[journey.id]) || missions.some(m => m.state === 'voting');
            const votableMissions = missions.filter(m => !['completed', 'active', 'skipped'].includes(m.state));
            const hasActiveMission = missions.some(m => m.state === 'active');
            const canStartVote    = votableMissions.length >= 2 && !hasActiveMission;
            const hasPendingStart = missions.some(m => m.state === 'pending_start');
            const voteEndTs = voteActiveMap[journey.id];
            const isVoteExpired = Boolean(voteEndTs) && new Date(voteEndTs).getTime() <= Date.now();

            const activeMission = missions.find(m => m.state === 'active') ?? null;

            return (
              <Fragment key={journey.id}>
                <JourneySync
                  journeyId={journey.id}
                  onMissionStateChange={(mission) => {
                    setFullMissions(prev => ({
                      ...prev,
                      [mission.journey_id]: prev[mission.journey_id]?.map(m =>
                        m.id === mission.id ? { ...m, state: mission.state } : m
                      ) ?? [],
                    }));
                  }}
                  onVoteCast={(vote) => {
                    setVoteCounts(prev => ({
                      ...prev,
                      [vote.journey_id]: {
                        ...(prev[vote.journey_id] ?? {}),
                        [vote.big_idea_id]: (prev[vote.journey_id]?.[vote.big_idea_id] ?? 0) + 1,
                      },
                    }));
                  }}
                />

                {hasActiveMission ? (
                  /* ── MONITORING VIEW — active mission ── */
                  <motion.section
                    key="monitor"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: ji * 0.07 }}
                  >
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-1">
                        <span
                          className="font-space font-bold tracking-[0.2em] text-[11px] px-3 py-1 rounded"
                          style={{ background: 'rgba(14,165,233,0.12)', color: '#0369A1', border: '1px solid rgba(14,165,233,0.3)' }}
                        >
                          LIVE CLASS
                        </span>
                        <h1 className="font-space font-black tracking-[0.12em]" style={{ fontSize: 22, color: '#1a1a2e' }}>
                          {journey.title}
                        </h1>
                      </div>
                      {activeMission && (
                        <p className="font-inter text-sm mt-1" style={{ color: 'rgba(26,26,46,0.45)' }}>
                          Mission {activeMission.order}: {activeMission.question}
                        </p>
                      )}
                    </div>
                    <JourneyMonitorView
                      journeyId={journey.id}
                      nextMission={activeMission ? { id: activeMission.id, order: activeMission.order, title: activeMission.question } : null}
                    />
                  </motion.section>
                ) : (
                  /* ── SETUP VIEW — no active mission ── */
                  <motion.section
                    key="setup"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: ji * 0.07 }}
                  >
                {/* Page header */}
                <div className="mb-8">
                  <h1 className="font-space font-black tracking-[0.12em] mb-1" style={{ fontSize: 28, color: '#1a1a2e' }}>
                    CLASS SETUP
                  </h1>
                  <p className="font-inter text-sm" style={{ color: 'rgba(26,26,46,0.4)' }}>
                    Transform your Google Classroom courses into structured learning journeys
                  </p>
                </div>

                {/* Pre-class CTA — shown when there's a mission ready to start */}
                {(() => {
                  const nextMission = missions.find(m => m.state === 'pending_start' || m.state === 'locked');
                  if (!nextMission) return null;
                  return (
                    <div
                      className="mb-8 rounded-2xl px-8 py-6 flex items-center justify-between"
                      style={{
                        background: 'linear-gradient(135deg, rgba(139,0,255,0.06) 0%, rgba(14,165,233,0.06) 100%)',
                        border: '1px solid rgba(139,0,255,0.18)',
                      }}
                    >
                      <div>
                        <p className="font-space font-black tracking-[0.08em] mb-1" style={{ fontSize: 17, color: '#1a1a2e' }}>
                          Ready for today&apos;s class?
                        </p>
                        <p className="font-inter text-sm" style={{ color: 'rgba(26,26,46,0.45)' }}>
                          Mission {nextMission.order}: {nextMission.question}
                        </p>
                      </div>
                      <motion.button
                        onClick={() => toggleMission(nextMission)}
                        disabled={activating === nextMission.id}
                        whileHover={activating !== nextMission.id ? { scale: 1.03 } : undefined}
                        whileTap={activating !== nextMission.id ? { scale: 0.97 } : undefined}
                        className="font-space font-bold tracking-[0.1em] flex items-center gap-2 px-6 py-3 rounded-full"
                        style={{
                          background: activating === nextMission.id
                            ? 'rgba(139,0,255,0.2)'
                            : 'linear-gradient(120deg, #8B00FF, #0EA5E9)',
                          color: '#fff',
                          border: 'none',
                          fontSize: 12,
                          cursor: activating === nextMission.id ? 'default' : 'pointer',
                          opacity: activating === nextMission.id ? 0.6 : 1,
                          boxShadow: activating === nextMission.id ? 'none' : '0 4px 20px rgba(139,0,255,0.35)',
                          flexShrink: 0,
                        }}
                      >
                        {activating === nextMission.id ? (
                          <><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Starting…</>
                        ) : (
                          <>▶ START CLASS</>
                        )}
                      </motion.button>
                    </div>
                  );
                })()}

                {/* Journey header */}
                <div className="flex items-center gap-3 mb-5">
                  <span
                    className="font-space font-bold tracking-[0.2em] text-[11px] px-3 py-1 rounded"
                    style={{ background: 'rgba(124,58,237,0.18)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.35)' }}
                  >
                    JOURNEY
                  </span>
                  <h2 className="font-space font-bold tracking-wide text-base" style={{ color: '#E8E8F0' }}>
                    {journey.title}
                  </h2>
                  <span className="font-inter text-xs ml-auto" style={{ color: 'rgba(26,26,46,0.3)' }}>
                    {missions.length} missions
                  </span>
                </div>

                {/* Mission accordion */}
                <div className="flex flex-col gap-3 mb-6">
                  {missions.map(mission => {
                    const st    = STATUS_STYLES[mission.state] ?? STATUS_STYLES['locked'];
                    const isExp = expanded === mission.id;

                    return (
                      <motion.div
                        key={mission.id}
                        layout
                        className="relative rounded-xl overflow-hidden"
                        style={{
                          background: mission.state === 'active'
                            ? 'linear-gradient(135deg, rgba(14,165,233,0.06) 0%, rgba(139,0,255,0.06) 100%)'
                            : mission.state === 'voting'
                            ? 'linear-gradient(135deg, rgba(139,0,255,0.06) 0%, rgba(255,0,128,0.04) 100%)'
                            : mission.state === 'pending_start'
                            ? 'linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(180,83,9,0.04) 100%)'
                            : mission.state === 'skipped'
                            ? 'rgba(26,26,46,0.015)'
                            : isExp
                            ? 'rgba(255,255,255,0.5)'
                            : 'rgba(255,255,255,0.4)',
                          border: `1px solid ${
                            mission.state === 'active'
                              ? 'rgba(14,165,233,0.25)'
                              : mission.state === 'voting'
                              ? 'rgba(139,0,255,0.25)'
                              : mission.state === 'pending_start'
                              ? 'rgba(245,158,11,0.3)'
                              : mission.state === 'skipped'
                              ? 'rgba(26,26,46,0.05)'
                              : isExp
                              ? 'rgba(255,255,255,0.85)'
                              : 'rgba(255,255,255,0.7)'
                          }`,
                          opacity: mission.state === 'skipped' ? 0.6 : 1,
                          transition: 'border-color 0.2s, background 0.2s',
                        }}
                      >
                        {/* Collapsed header — click to expand */}
                        <div
                          className="flex items-center gap-5 px-6 py-5 cursor-pointer select-none"
                          onClick={() => setExpanded(prev => prev === mission.id ? null : mission.id)}
                        >
                          <span
                            className="font-space font-black text-2xl w-8 text-center flex-shrink-0"
                            style={{ color: 'rgba(26,26,46,0.15)' }}
                          >
                            {String(mission.order).padStart(2, '0')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-inter text-[11px] mb-1" style={{ color: 'rgba(26,26,46,0.4)' }}>
                              {mission.projectTitle}
                            </p>
                            <p className="font-space font-bold text-sm leading-snug truncate" style={{
                              color: mission.state === 'skipped' ? 'rgba(26,26,46,0.3)' : '#1a1a2e',
                            }}>
                              {mission.question}
                            </p>
                            {(mission.state === 'pending_start' || mission.state === 'skipped') && voteCounts[journey.id] && (
                              <p className="font-space text-[9px] font-bold tracking-[0.1em] mt-1" style={{
                                color: mission.state === 'pending_start' ? '#B45309' : 'rgba(26,26,46,0.2)',
                              }}>
                                {voteCounts[journey.id][mission.id] ?? 0}{' '}
                                {(voteCounts[journey.id][mission.id] ?? 0) === 1 ? 'VOTE' : 'VOTES'}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {/* WINNER badge for pending_start */}
                            {mission.state === 'pending_start' && (
                              <div
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-space font-bold tracking-[0.15em]"
                                style={{
                                  background: 'rgba(245,158,11,0.12)',
                                  color: '#B45309',
                                  border: '1px solid rgba(245,158,11,0.35)',
                                  boxShadow: '0 0 12px rgba(245,158,11,0.1)',
                                }}
                              >
                                ✦ WINNER
                              </div>
                            )}
                            {/* Status badge */}
                            <div
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-space font-bold tracking-[0.15em]"
                              style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}40` }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: st.dot, boxShadow: mission.state === 'active' || mission.state === 'voting' ? `0 0 6px ${st.dot}` : 'none' }}
                              />
                              {st.label}
                            </div>
                            {/* REVIEW for active */}
                            {mission.state === 'active' && (
                              <motion.button
                                onClick={e => { e.stopPropagation(); router.push(`/teacher/mission/${mission.id}`); }}
                                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                className="px-4 py-2 rounded-lg text-[10px] font-space font-bold tracking-[0.12em]"
                                style={{ background: 'rgba(14,165,233,0.12)', color: '#0369A1', border: '1px solid rgba(14,165,233,0.3)' }}
                              >
                                REVIEW →
                              </motion.button>
                            )}
                            {/* ACTIVATE for pending_start — winner of concluded vote */}
                            {mission.state === 'pending_start' && (
                              <motion.button
                                onClick={e => { e.stopPropagation(); toggleMission(mission); }}
                                whileHover={activating !== mission.id ? { scale: 1.04 } : undefined}
                                whileTap={activating !== mission.id ? { scale: 0.96 } : undefined}
                                disabled={activating === mission.id}
                                className="px-4 py-2 rounded-lg text-[10px] font-space font-bold tracking-[0.12em]"
                                style={{
                                  background: 'rgba(245,158,11,0.12)',
                                  color: '#B45309',
                                  border: '1px solid rgba(245,158,11,0.35)',
                                  opacity: activating === mission.id ? 0.4 : 1,
                                  cursor: activating === mission.id ? 'default' : 'pointer',
                                }}
                              >
                                {activating === mission.id ? '…' : 'ACTIVATE'}
                              </motion.button>
                            )}
                            {/* REOPEN for completed — blocked while vote is live */}
                            {mission.state === 'completed' && (
                              <motion.button
                                onClick={e => { e.stopPropagation(); if (!voteIsLive) toggleMission(mission); }}
                                whileHover={!voteIsLive && activating !== mission.id ? { scale: 1.04 } : undefined}
                                whileTap={!voteIsLive && activating !== mission.id ? { scale: 0.96 } : undefined}
                                disabled={activating === mission.id || voteIsLive}
                                className="px-4 py-2 rounded-lg text-[10px] font-space font-bold tracking-[0.12em]"
                                style={{
                                  background: 'rgba(26,26,46,0.05)',
                                  color: voteIsLive ? 'rgba(26,26,46,0.2)' : 'rgba(26,26,46,0.65)',
                                  border: '1px solid rgba(26,26,46,0.12)',
                                  opacity: (activating === mission.id || voteIsLive) ? 0.4 : 1,
                                  cursor: voteIsLive ? 'not-allowed' : 'pointer',
                                }}
                                title={voteIsLive ? 'Cannot change mission status while a vote is running' : undefined}
                              >
                                {activating === mission.id ? '…' : 'REOPEN'}
                              </motion.button>
                            )}
                            {/* Expand chevron */}
                            <span
                              style={{
                                color: 'rgba(26,26,46,0.3)', fontSize: 14,
                                display: 'inline-block',
                                transform: isExp ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.2s',
                              }}
                            >▾</span>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        <AnimatePresence initial={false}>
                          {isExp && (
                            <motion.div
                              key="detail"
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div
                                className="px-6 pb-5 flex flex-col gap-4"
                                style={{ borderTop: '1px solid rgba(26,26,46,0.06)', paddingTop: 20 }}
                              >
                                {/* Description */}
                                {mission.questionDescription && (
                                  <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(26,26,46,0.5)' }}>
                                    {mission.questionDescription}
                                  </p>
                                )}

                                {/* Student project box */}
                                {mission.projectDescription && (
                                  <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(139,0,255,0.05)', border: '1px solid rgba(139,0,255,0.12)' }}>
                                    <p className="font-space text-[9px] tracking-[0.2em] mb-1" style={{ color: '#8B00FF' }}>STUDENT PROJECT</p>
                                    <p className="font-inter text-xs leading-relaxed" style={{ color: 'rgba(26,26,46,0.5)' }}>
                                      {mission.projectDescription}
                                    </p>
                                  </div>
                                )}

                                {/* Activities */}
                                {mission.planets && mission.planets.length > 0 && (
                                  <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.7)' }}>
                                    <p className="font-space text-[9px] tracking-[0.2em]" style={{ color: 'rgba(26,26,46,0.3)' }}>
                                      WHAT STUDENTS WILL DO · {mission.planets.length} ACTIVITIES
                                    </p>
                                    <div className="flex flex-col gap-2">
                                      {mission.planets.map((planet, pi) => (
                                        <div key={planet.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)' }}>
                                          <span className="font-space font-black text-[10px] mt-0.5 flex-shrink-0" style={{ color: 'rgba(26,26,46,0.2)' }}>
                                            {String(pi + 1).padStart(2, '0')}
                                          </span>
                                          <div>
                                            <p className="font-space font-bold text-xs mb-0.5" style={{ color: '#1a1a2e' }}>{planet.title}</p>
                                            <p className="font-inter text-[11px] leading-relaxed" style={{ color: 'rgba(26,26,46,0.4)' }}>
                                              {planet.content.slice(0, 140)}{planet.content.length > 140 ? '…' : ''}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Preview student view */}
                                <button
                                  onClick={() => setStudentView(mission)}
                                  className="w-full py-2.5 rounded-lg font-space text-[10px] font-bold tracking-[0.12em] transition-all"
                                  style={{ background: 'rgba(139,0,255,0.04)', color: '#8B00FF', border: '1px dashed rgba(139,0,255,0.25)' }}
                                >
                                  👩‍🎓 PREVIEW STUDENT VIEW →
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Active / voting / pending glow stripe */}
                        {(mission.state === 'active' || mission.state === 'voting' || mission.state === 'pending_start') && (
                          <div
                            className="absolute left-0 top-0 bottom-0 w-0.5"
                            style={{
                              background: mission.state === 'pending_start'
                                ? 'linear-gradient(180deg, #F59E0B, #B45309)'
                                : 'linear-gradient(180deg, #0EA5E9, #8B00FF)',
                            }}
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Vote setup — active state (countdown + share) or setup form */}
                {voteIsLive ? (
                  <motion.div
                    key="vote-active"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel"
                    style={{
                      padding: 24,
                      borderColor: isVoteExpired ? 'rgba(255,140,0,0.3)' : 'rgba(14,165,233,0.25)',
                    }}
                  >
                    {/* Live / expired badge */}
                    <div className="flex items-center gap-2 mb-5">
                      <span
                        className={`w-2 h-2 rounded-full${isVoteExpired ? '' : ' animate-pulse'}`}
                        style={{
                          background: isVoteExpired ? '#FF8C00' : '#0EA5E9',
                          boxShadow: `0 0 8px ${isVoteExpired ? '#FF8C00' : '#0EA5E9'}`,
                        }}
                      />
                      <p className="font-space text-[10px] tracking-[0.2em]" style={{ color: isVoteExpired ? '#FF8C00' : '#0369A1' }}>
                        {isVoteExpired ? 'VOTE EXPIRED' : 'VOTE IS LIVE'}
                      </p>
                      <button
                        onClick={() => {
                          setEditVoteEnd(voteActiveMap[journey.id] ?? '');
                          setEditVoteJourneyId(journey.id);
                        }}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg font-space text-[10px] font-bold tracking-[0.12em] transition-all hover:opacity-80"
                        style={{
                          background: isVoteExpired ? 'rgba(255,140,0,0.1)' : 'rgba(14,165,233,0.1)',
                          color: isVoteExpired ? '#FF8C00' : '#0369A1',
                          border: `1px solid ${isVoteExpired ? 'rgba(255,140,0,0.35)' : 'rgba(14,165,233,0.3)'}`,
                        }}
                        title="Edit vote deadline"
                      >
                        ✎ EDIT
                      </button>
                    </div>

                    {/* Countdown */}
                    <div className="text-center mb-6">
                      <p className="font-space text-[9px] tracking-[0.2em] mb-2" style={{ color: 'rgba(26,26,46,0.35)' }}>
                        {isVoteExpired ? 'ENDED' : 'CLOSES IN'}
                      </p>
                      <p className="font-space font-black text-4xl tracking-wider" style={{ color: isVoteExpired ? '#FF8C00' : '#1a1a2e' }}>
                        {voteActiveMap[journey.id] ? <Countdown endIso={voteActiveMap[journey.id]} /> : 'VOTE ACTIVE'}
                      </p>
                    </div>

                    {/* Action: FINISH VOTE when expired, SHARE when live */}
                    {isVoteExpired ? (
                      <motion.button
                        onClick={() => setFinishConfirmId(journey.id)}
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.975 }}
                        className="w-full py-3.5 rounded-xl font-space font-bold text-sm tracking-[0.12em] flex items-center justify-center gap-2"
                        style={{
                          background: 'linear-gradient(120deg, rgba(255,140,0,0.85), rgba(255,184,0,0.6))',
                          color: '#fff',
                          border: '1px solid rgba(255,140,0,0.55)',
                          boxShadow: '0 4px 20px rgba(255,140,0,0.25)',
                          cursor: 'pointer',
                        }}
                      >
                        ◼ FINISH VOTE &amp; SEE RESULTS
                      </motion.button>
                    ) : (
                      <div className="relative group">
                        <motion.button
                          onClick={() => {
                            const msg = `Hey students! Please download the app using the link below and vote on what you want to do in our upcoming class!\n\nDownload link: [INSERT_LINK_PLACEHOLDER]`;
                            navigator.clipboard.writeText(msg).catch(() => {});
                            setCopiedId(journey.id);
                            setTimeout(() => setCopiedId(id => id === journey.id ? null : id), 2500);
                          }}
                          whileHover={{ scale: 1.015 }}
                          whileTap={{ scale: 0.975 }}
                          className="w-full py-3.5 rounded-xl font-space font-bold text-sm tracking-[0.12em] flex items-center justify-center gap-2"
                          style={{
                            background: copiedId === journey.id
                              ? 'linear-gradient(120deg, rgba(5,150,105,0.8), rgba(14,165,233,0.6))'
                              : 'linear-gradient(120deg, rgba(37,211,102,0.75), rgba(14,165,233,0.55))',
                            color: '#fff',
                            border: `1px solid ${copiedId === journey.id ? 'rgba(5,150,105,0.5)' : 'rgba(37,211,102,0.45)'}`,
                            boxShadow: '0 4px 20px rgba(37,211,102,0.2)',
                            cursor: 'pointer',
                          }}
                        >
                          {copiedId === journey.id ? '✓ COPIED!' : '📲 SHARE WITH STUDENTS'}
                        </motion.button>

                        {/* Tooltip shown on hover */}
                        <div
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg font-inter text-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          style={{
                            background: 'rgba(255,255,255,0.9)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,255,255,0.85)',
                            color: 'rgba(26,26,46,0.7)',
                            boxShadow: '0 8px 24px rgba(139,0,255,0.1)',
                            zIndex: 10,
                          }}
                        >
                          Share this with your students on WhatsApp.
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : hasPendingStart ? (
                  <motion.div
                    key="vote-concluded"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-5"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} />
                      <p className="font-space text-[10px] tracking-[0.2em]" style={{ color: '#B45309' }}>
                        VOTE CONCLUDED
                      </p>
                    </div>
                    <p className="font-inter text-xs leading-relaxed" style={{ color: 'rgba(26,26,46,0.45)' }}>
                      Results are in. Click <span style={{ color: '#B45309' }}>ACTIVATE</span> next to the winning mission to start it for your class.
                    </p>
                  </motion.div>
                ) : allLocked ? (
                  <motion.div
                    key="vote-setup"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel"
                    style={{ padding: 24 }}
                  >
                    <p className="font-space text-[10px] tracking-[0.2em] mb-5" style={{ color: 'rgba(26,26,46,0.35)' }}>
                      VOTE DURATION
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="font-space text-[9px] font-bold tracking-[0.12em] block mb-2" style={{ color: 'rgba(26,26,46,0.35)' }}>
                          STARTS
                        </label>
                        <input
                          type="datetime-local"
                          value={voteStart}
                          onChange={e => setVoteStart(e.target.value)}
                          className="input-light w-full px-3 py-2.5 font-inter text-xs outline-none"
                          style={{ colorScheme: 'light' }}
                        />
                      </div>
                      <div>
                        <label className="font-space text-[9px] font-bold tracking-[0.12em] block mb-2" style={{ color: 'rgba(26,26,46,0.35)' }}>
                          ENDS
                        </label>
                        <input
                          type="datetime-local"
                          value={voteEnd}
                          onChange={e => setVoteEnd(e.target.value)}
                          className="input-light w-full px-3 py-2.5 font-inter text-xs outline-none"
                          style={{ colorScheme: 'light' }}
                        />
                      </div>
                    </div>

                    <p className="font-inter text-[11px] mb-4" style={{ color: 'rgba(26,26,46,0.3)' }}>
                      Default: opens today, closes 48 h later · Ties broken randomly
                    </p>

                    {!canStartVote && (
                      <div className="rounded-lg px-3 py-2.5 mb-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <p className="font-inter text-xs leading-relaxed" style={{ color: '#B45309' }}>
                          {hasActiveMission
                            ? '⚠️ A mission is already active. End it before starting a vote.'
                            : `⚠️ Need at least 2 available missions to vote. Currently ${votableMissions.length}.`}
                        </p>
                      </div>
                    )}

                    <motion.button
                      onClick={() => startVote(journey.id, missions)}
                      disabled={starting || !canStartVote}
                      whileHover={!starting && canStartVote ? { scale: 1.015 } : undefined}
                      whileTap={!starting && canStartVote ? { scale: 0.975 } : undefined}
                      className="w-full py-3.5 rounded-xl font-space font-bold text-sm tracking-[0.12em]"
                      style={{
                        background: canStartVote
                          ? 'linear-gradient(120deg, rgba(139,0,255,0.8), rgba(14,165,233,0.55))'
                          : 'rgba(26,26,46,0.05)',
                        color: canStartVote ? '#fff' : 'rgba(26,26,46,0.2)',
                        border: canStartVote ? '1px solid rgba(139,0,255,0.4)' : '1px solid rgba(26,26,46,0.08)',
                        boxShadow: canStartVote ? '0 4px 20px rgba(139,0,255,0.25)' : 'none',
                        cursor: starting || !canStartVote ? 'default' : 'pointer',
                      }}
                    >
                      {starting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          STARTING VOTE…
                        </span>
                      ) : '🗳️ START VOTE NOW'}
                    </motion.button>
                  </motion.div>
                ) : null}
                  </motion.section>
                )}
              </Fragment>
            );
          })}
        </div>
      )}

      <StudentMobilePreview mission={studentView} onClose={() => setStudentView(null)} />

      <VoteManageModals
        editOpen={editVoteJourneyId !== null}
        editEndValue={editVoteEnd}
        onEditEndChange={val => setEditVoteEnd(val)}
        onEditSave={() => { if (editVoteJourneyId) handleUpdateVoteEnd(editVoteJourneyId); }}
        onEditClose={() => setEditVoteJourneyId(null)}
        onEditOpenFinish={() => { const id = editVoteJourneyId; setEditVoteJourneyId(null); setFinishConfirmId(id); }}
        onEditOpenDelete={() => { const id = editVoteJourneyId; setEditVoteJourneyId(null); setDeleteConfirmId(id); }}
        finishOpen={finishConfirmId !== null}
        onFinishConfirm={() => { if (finishConfirmId) handleFinishVote(finishConfirmId); }}
        onFinishClose={() => setFinishConfirmId(null)}
        deleteOpen={deleteConfirmId !== null}
        onDeleteConfirm={() => { if (deleteConfirmId) handleDeleteVote(deleteConfirmId); }}
        onDeleteClose={() => setDeleteConfirmId(null)}
        loading={manageLoading}
      />
    </div>
  );
}
