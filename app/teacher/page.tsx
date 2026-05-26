'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useSupabaseRealtime, type RealtimeMission, type RealtimeVote } from '@/hooks/useSupabaseRealtime';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getTeacherId, getCourses, saveCourses, type CourseRecord } from '@/lib/teacher-store';
import { toDatetimeLocal } from '@/lib/vote-utils';
import Countdown from '@/components/Countdown';
import StudentMobilePreview from '@/components/StudentMobilePreview';
import VoteManageModals from '@/components/VoteManageModals';

type MissionState = 'locked' | 'voting' | 'pending_start' | 'active' | 'completed' | 'skipped';

interface Plant {
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
  plants?: Plant[];
}

interface Journey {
  id: string;
  title: string;
  googleCourseId: string;
  missions: Mission[];
  activeVoteSession: { id: string; endsAt: string } | null;
}

const STATUS_STYLES: Record<MissionState, { label: string; color: string; bg: string; dot: string }> = {
  locked:        { label: 'LOCKED',   color: 'rgba(232,232,240,0.35)', bg: 'rgba(232,232,240,0.06)', dot: 'rgba(232,232,240,0.3)' },
  voting:        { label: 'VOTING',   color: '#7C3AED',                bg: 'rgba(124,58,237,0.1)',   dot: '#7C3AED' },
  pending_start: { label: 'PENDING',  color: '#FFD600',                bg: 'rgba(255,214,0,0.08)',   dot: '#FFD600' },
  active:        { label: 'LIVE',     color: '#00D4FF',                bg: 'rgba(0,212,255,0.1)',    dot: '#00D4FF' },
  completed:     { label: 'COMPLETE', color: '#00F5A0',                bg: 'rgba(0,245,160,0.08)',   dot: '#00F5A0' },
  skipped:       { label: 'SKIPPED',  color: 'rgba(232,232,240,0.2)', bg: 'rgba(232,232,240,0.03)', dot: 'rgba(232,232,240,0.15)' },
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

export default function TeacherDashboard() {
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
    const teacherId = getTeacherId();
    if (!teacherId) return;
    setLoading(true);
    fetch(`/api/teacher/journeys?teacherId=${teacherId}`)
      .then(r => r.json())
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
    const teacherId = getTeacherId();
    const cached = getCourses();
    if (cached.length > 0) {
      setCourses(cached);
      fetchJourneys();
      return;
    }
    if (teacherId) {
      fetch(`/api/teacher/courses?teacherId=${teacherId}`)
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
            body: JSON.stringify({ missionId: m.id, state: 'locked' }),
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
        body: JSON.stringify({ missionId: mission.id, state: nextState }),
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
            body: JSON.stringify({ missionId: m.id, state: m.id === resolvedWinnerId ? 'pending_start' : 'skipped' }),
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
            body: JSON.stringify({ missionId: m.id, state: 'locked' }),
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
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <h1 className="font-space font-black tracking-[0.12em] mb-1" style={{ fontSize: 28, color: '#E8E8F0' }}>
          CLASS SETUP
        </h1>
        <p className="font-inter text-sm" style={{ color: 'rgba(232,232,240,0.4)' }}>
          Transform your Google Classroom courses into structured learning journeys
        </p>
      </motion.div>

      {loading ? (
        <div className="flex items-center gap-3 mt-24 justify-center">
          <span className="w-5 h-5 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
          <span className="font-space text-xs tracking-widest text-white/30">LOADING YOUR GOOGLE CLASSES…</span>
        </div>
      ) : journeys.length === 0 ? (
        <ConnectState courses={courses} onConnected={fetchJourneys} />
      ) : (
        <div className="flex flex-col gap-10">
          {journeys.map((journey, ji) => {
            const missions        = fullMissions[journey.id] ?? journey.missions;
            const allLocked       = missions.every(m => m.state === 'locked');
            const voteIsLive      = Boolean(voteActiveMap[journey.id]) || missions.some(m => m.state === 'voting');
            const votableMissions = missions.filter(m => !['completed', 'active', 'skipped'].includes(m.state));
            const hasActiveMission = missions.some(m => m.state === 'active');
            const canStartVote    = votableMissions.length >= 2 && !hasActiveMission;
            const hasPendingStart = missions.some(m => m.state === 'pending_start');
            const voteEndTs = voteActiveMap[journey.id];
            const isVoteExpired = Boolean(voteEndTs) && new Date(voteEndTs).getTime() <= Date.now();

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
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ji * 0.07 }}
                >
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
                  <span className="font-inter text-xs ml-auto" style={{ color: 'rgba(232,232,240,0.3)' }}>
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
                            ? 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(124,58,237,0.08) 100%)'
                            : mission.state === 'voting'
                            ? 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(255,0,128,0.04) 100%)'
                            : mission.state === 'pending_start'
                            ? 'linear-gradient(135deg, rgba(255,214,0,0.07) 0%, rgba(255,140,0,0.04) 100%)'
                            : mission.state === 'skipped'
                            ? 'rgba(232,232,240,0.015)'
                            : isExp
                            ? 'rgba(232,232,240,0.04)'
                            : 'rgba(232,232,240,0.03)',
                          border: `1px solid ${
                            mission.state === 'active'
                              ? 'rgba(0,212,255,0.25)'
                              : mission.state === 'voting'
                              ? 'rgba(124,58,237,0.3)'
                              : mission.state === 'pending_start'
                              ? 'rgba(255,214,0,0.3)'
                              : mission.state === 'skipped'
                              ? 'rgba(232,232,240,0.05)'
                              : isExp
                              ? 'rgba(232,232,240,0.13)'
                              : 'rgba(232,232,240,0.08)'
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
                            style={{ color: 'rgba(232,232,240,0.15)' }}
                          >
                            {String(mission.order).padStart(2, '0')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-inter text-[11px] mb-1" style={{ color: 'rgba(232,232,240,0.4)' }}>
                              {mission.projectTitle}
                            </p>
                            <p className="font-space font-bold text-sm leading-snug truncate" style={{
                              color: mission.state === 'skipped' ? 'rgba(232,232,240,0.3)' : '#E8E8F0',
                            }}>
                              {mission.question}
                            </p>
                            {(mission.state === 'pending_start' || mission.state === 'skipped') && voteCounts[journey.id] && (
                              <p className="font-space text-[9px] font-bold tracking-[0.1em] mt-1" style={{
                                color: mission.state === 'pending_start' ? 'rgba(255,214,0,0.75)' : 'rgba(232,232,240,0.2)',
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
                                  background: 'rgba(255,214,0,0.12)',
                                  color: '#FFD600',
                                  border: '1px solid rgba(255,214,0,0.35)',
                                  boxShadow: '0 0 12px rgba(255,214,0,0.15)',
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
                                style={{ background: 'rgba(0,212,255,0.15)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.4)' }}
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
                                  background: 'rgba(255,214,0,0.15)',
                                  color: '#FFD600',
                                  border: '1px solid rgba(255,214,0,0.4)',
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
                                  background: 'rgba(232,232,240,0.06)',
                                  color: voteIsLive ? 'rgba(232,232,240,0.2)' : '#E8E8F0',
                                  border: '1px solid rgba(232,232,240,0.15)',
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
                                color: 'rgba(232,232,240,0.3)', fontSize: 14,
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
                                style={{ borderTop: '1px solid rgba(232,232,240,0.06)', paddingTop: 20 }}
                              >
                                {/* Description */}
                                {mission.questionDescription && (
                                  <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(232,232,240,0.5)' }}>
                                    {mission.questionDescription}
                                  </p>
                                )}

                                {/* Student project box */}
                                {mission.projectDescription && (
                                  <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)' }}>
                                    <p className="font-space text-[9px] tracking-[0.2em] mb-1" style={{ color: '#7C3AED' }}>STUDENT PROJECT</p>
                                    <p className="font-inter text-xs leading-relaxed" style={{ color: 'rgba(232,232,240,0.5)' }}>
                                      {mission.projectDescription}
                                    </p>
                                  </div>
                                )}

                                {/* Activities */}
                                {mission.plants && mission.plants.length > 0 && (
                                  <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(232,232,240,0.02)', border: '1px solid rgba(232,232,240,0.07)' }}>
                                    <p className="font-space text-[9px] tracking-[0.2em]" style={{ color: 'rgba(232,232,240,0.3)' }}>
                                      WHAT STUDENTS WILL DO · {mission.plants.length} ACTIVITIES
                                    </p>
                                    <div className="flex flex-col gap-2">
                                      {mission.plants.map((plant, pi) => (
                                        <div key={plant.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5" style={{ background: 'rgba(232,232,240,0.03)', border: '1px solid rgba(232,232,240,0.06)' }}>
                                          <span className="font-space font-black text-[10px] mt-0.5 flex-shrink-0" style={{ color: 'rgba(232,232,240,0.2)' }}>
                                            {String(pi + 1).padStart(2, '0')}
                                          </span>
                                          <div>
                                            <p className="font-space font-bold text-xs mb-0.5" style={{ color: '#E8E8F0' }}>{plant.title}</p>
                                            <p className="font-inter text-[11px] leading-relaxed" style={{ color: 'rgba(232,232,240,0.4)' }}>
                                              {plant.content.slice(0, 140)}{plant.content.length > 140 ? '…' : ''}
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
                                  style={{ background: 'rgba(0,212,255,0.05)', color: '#00D4FF', border: '1px dashed rgba(0,212,255,0.3)' }}
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
                                ? 'linear-gradient(180deg, #FFD600, #FF8C00)'
                                : 'linear-gradient(180deg, #00D4FF, #7C3AED)',
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
                    className="rounded-xl p-6"
                    style={{
                      background: isVoteExpired ? 'rgba(255,140,0,0.05)' : 'rgba(0,212,255,0.05)',
                      border: `1px solid ${isVoteExpired ? 'rgba(255,140,0,0.3)' : 'rgba(0,212,255,0.2)'}`,
                    }}
                  >
                    {/* Live / expired badge */}
                    <div className="flex items-center gap-2 mb-5">
                      <span
                        className={`w-2 h-2 rounded-full${isVoteExpired ? '' : ' animate-pulse'}`}
                        style={{
                          background: isVoteExpired ? '#FF8C00' : '#00D4FF',
                          boxShadow: `0 0 8px ${isVoteExpired ? '#FF8C00' : '#00D4FF'}`,
                        }}
                      />
                      <p className="font-space text-[10px] tracking-[0.2em]" style={{ color: isVoteExpired ? '#FF8C00' : '#00D4FF' }}>
                        {isVoteExpired ? 'VOTE EXPIRED' : 'VOTE IS LIVE'}
                      </p>
                      <button
                        onClick={() => {
                          setEditVoteEnd(voteActiveMap[journey.id] ?? '');
                          setEditVoteJourneyId(journey.id);
                        }}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg font-space text-[10px] font-bold tracking-[0.12em] transition-all hover:opacity-80"
                        style={{
                          background: isVoteExpired ? 'rgba(255,140,0,0.12)' : 'rgba(0,212,255,0.12)',
                          color: isVoteExpired ? '#FF8C00' : '#00D4FF',
                          border: `1px solid ${isVoteExpired ? 'rgba(255,140,0,0.4)' : 'rgba(0,212,255,0.35)'}`,
                        }}
                        title="Edit vote deadline"
                      >
                        ✎ EDIT
                      </button>
                    </div>

                    {/* Countdown */}
                    <div className="text-center mb-6">
                      <p className="font-space text-[9px] tracking-[0.2em] mb-2" style={{ color: 'rgba(232,232,240,0.35)' }}>
                        {isVoteExpired ? 'ENDED' : 'CLOSES IN'}
                      </p>
                      <p className="font-space font-black text-4xl tracking-wider" style={{ color: isVoteExpired ? '#FF8C00' : '#E8E8F0' }}>
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
                          color: '#0a0a0f',
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
                              ? 'linear-gradient(120deg, rgba(0,245,160,0.7), rgba(0,212,255,0.5))'
                              : 'linear-gradient(120deg, rgba(37,211,102,0.7), rgba(0,212,255,0.5))',
                            color: '#E8E8F0',
                            border: `1px solid ${copiedId === journey.id ? 'rgba(0,245,160,0.5)' : 'rgba(37,211,102,0.5)'}`,
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
                            background: 'rgba(10,10,20,0.96)',
                            border: '1px solid rgba(232,232,240,0.12)',
                            color: 'rgba(232,232,240,0.85)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
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
                    style={{ background: 'rgba(255,214,0,0.04)', border: '1px solid rgba(255,214,0,0.2)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: '#FFD600' }} />
                      <p className="font-space text-[10px] tracking-[0.2em]" style={{ color: '#FFD600' }}>
                        VOTE CONCLUDED
                      </p>
                    </div>
                    <p className="font-inter text-xs leading-relaxed" style={{ color: 'rgba(232,232,240,0.4)' }}>
                      Results are in. Click <span style={{ color: '#FFD600' }}>ACTIVATE</span> next to the winning mission to start it for your class.
                    </p>
                  </motion.div>
                ) : allLocked ? (
                  <motion.div
                    key="vote-setup"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-6"
                    style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.2)' }}
                  >
                    <p className="font-space text-[10px] tracking-[0.2em] mb-5" style={{ color: 'rgba(232,232,240,0.35)' }}>
                      VOTE DURATION
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="font-space text-[9px] font-bold tracking-[0.12em] block mb-2" style={{ color: 'rgba(232,232,240,0.35)' }}>
                          STARTS
                        </label>
                        <input
                          type="datetime-local"
                          value={voteStart}
                          onChange={e => setVoteStart(e.target.value)}
                          className="w-full rounded-lg px-3 py-2.5 font-inter text-xs outline-none"
                          style={{
                            background: 'rgba(232,232,240,0.04)',
                            border: '1px solid rgba(232,232,240,0.12)',
                            color: '#E8E8F0',
                            colorScheme: 'dark',
                          }}
                        />
                      </div>
                      <div>
                        <label className="font-space text-[9px] font-bold tracking-[0.12em] block mb-2" style={{ color: 'rgba(232,232,240,0.35)' }}>
                          ENDS
                        </label>
                        <input
                          type="datetime-local"
                          value={voteEnd}
                          onChange={e => setVoteEnd(e.target.value)}
                          className="w-full rounded-lg px-3 py-2.5 font-inter text-xs outline-none"
                          style={{
                            background: 'rgba(232,232,240,0.04)',
                            border: '1px solid rgba(232,232,240,0.12)',
                            color: '#E8E8F0',
                            colorScheme: 'dark',
                          }}
                        />
                      </div>
                    </div>

                    <p className="font-inter text-[11px] mb-4" style={{ color: 'rgba(232,232,240,0.3)' }}>
                      Default: opens today, closes 48 h later · Ties broken randomly
                    </p>

                    {!canStartVote && (
                      <div className="rounded-lg px-3 py-2.5 mb-4" style={{ background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.2)' }}>
                        <p className="font-inter text-xs leading-relaxed" style={{ color: 'rgba(255,184,0,0.85)' }}>
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
                          ? 'linear-gradient(120deg, rgba(124,58,237,0.8), rgba(0,212,255,0.5))'
                          : 'rgba(232,232,240,0.05)',
                        color: canStartVote ? '#E8E8F0' : 'rgba(232,232,240,0.2)',
                        border: canStartVote ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(232,232,240,0.08)',
                        boxShadow: canStartVote ? '0 4px 20px rgba(124,58,237,0.25)' : 'none',
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

function ConnectState({
  courses,
  onConnected,
}: {
  courses: CourseRecord[];
  onConnected: () => void;
}) {
  const router = useRouter();
  const [selected,   setSelected]   = useState<string | null>(() => courses.length > 0 ? courses[0].id : null);
  const [connecting, setConnecting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function handleConnect() {
    const course = courses.find(c => c.id === selected);
    if (!course) return;
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/teacher/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: getTeacherId(),
          courses: [{ id: course.id, name: course.name }],
        }),
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      onConnected();
      if (data.journeyId) {
        router.push(`/teacher/vote/new?journeyId=${data.journeyId}`);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setConnecting(false);
    }
  }

  if (courses.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center mt-28 gap-4">
        <p className="font-space text-sm tracking-widest" style={{ color: 'rgba(232,232,240,0.4)' }}>NO CLASSROOMS DETECTED</p>
        <p className="font-inter text-xs text-center max-w-xs" style={{ color: 'rgba(232,232,240,0.25)' }}>
          Your Google Classroom courses couldn&apos;t be loaded. Sign out and sign back in to try again.
        </p>
        <button
          onClick={() => { if (typeof window !== 'undefined') { localStorage.clear(); window.location.href = '/'; } }}
          className="mt-2 px-5 py-2 rounded-lg font-space font-bold text-xs tracking-[0.12em]"
          style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.4)' }}
        >
          SIGN OUT &amp; RETRY
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="max-w-lg mx-auto mt-16">
      <div className="mb-6">
        <h2 className="font-space font-black tracking-[0.12em] mb-2" style={{ fontSize: 20, color: '#E8E8F0' }}>
          SELECT YOUR CLASSROOM
        </h2>
        <p className="font-inter text-sm" style={{ color: 'rgba(232,232,240,0.4)' }}>
          Choose one Google Classroom to turn into an Astroli journey. Your roster is pulled automatically — no manual entry needed.
        </p>
      </div>

      {/* Phase 0 hint */}
      <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-6" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.18)' }}>
        <span style={{ color: '#00D4FF', fontSize: 14, flexShrink: 0, marginTop: 1 }}>ℹ</span>
        <p className="font-inter text-xs leading-relaxed" style={{ color: 'rgba(232,232,240,0.5)' }}>
          <span style={{ color: '#00D4FF', fontWeight: 600 }}>Phase 0 — one journey at a time.</span>{' '}
          During this preview phase you can activate one classroom journey at a time. Your other sections will be available in Phase 1 once your first journey is live.
        </p>
      </div>

      {/* Course list — radio single-select */}
      <div className="flex flex-col gap-3 mb-8">
        {courses.map((course, idx) => {
          const isSelected = selected === course.id;
          const isLocked   = idx > 0;
          return (
            <button
              key={course.id}
              onClick={() => !isLocked && setSelected(course.id)}
              disabled={isLocked}
              className="flex items-center gap-4 rounded-xl px-5 py-4 text-left transition-all"
              style={{
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(0,212,255,0.06) 100%)'
                  : 'rgba(232,232,240,0.03)',
                border: `1px solid ${isSelected ? 'rgba(124,58,237,0.4)' : 'rgba(232,232,240,0.08)'}`,
                opacity: isLocked ? 0.38 : 1,
                cursor: isLocked ? 'not-allowed' : 'pointer',
              }}
            >
              {/* Radio dot */}
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${isSelected ? '#7C3AED' : 'rgba(232,232,240,0.2)'}`, background: isSelected ? 'rgba(124,58,237,0.15)' : 'transparent' }}
              >
                {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C3AED' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-space font-bold text-sm truncate" style={{ color: isLocked ? 'rgba(232,232,240,0.4)' : '#E8E8F0' }}>
                  {course.name}
                </p>
                {course.section && (
                  <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(232,232,240,0.3)' }}>{course.section}</p>
                )}
              </div>
              {isLocked ? (
                <span className="font-space text-[9px] font-bold tracking-[0.1em] px-2 py-1 rounded flex-shrink-0" style={{ background: 'rgba(232,232,240,0.05)', color: 'rgba(232,232,240,0.3)', border: '1px solid rgba(232,232,240,0.1)' }}>
                  🔒 PHASE 1
                </span>
              ) : isSelected ? (
                <span className="font-space text-[9px] font-bold tracking-[0.15em] px-2 py-1 rounded flex-shrink-0" style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.3)' }}>
                  1 JOURNEY · 3 MISSIONS
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <motion.button
        onClick={handleConnect}
        disabled={connecting || selected === null}
        whileHover={!connecting && selected !== null ? { scale: 1.02 } : undefined}
        whileTap={!connecting && selected !== null ? { scale: 0.97 } : undefined}
        className="w-full py-3 rounded-xl font-space font-bold text-sm tracking-[0.12em]"
        style={{
          background: selected !== null ? 'linear-gradient(120deg, rgba(124,58,237,0.7), rgba(0,212,255,0.4))' : 'rgba(232,232,240,0.05)',
          color: selected !== null ? '#E8E8F0' : 'rgba(232,232,240,0.2)',
          border: `1px solid ${selected !== null ? 'rgba(124,58,237,0.5)' : 'rgba(232,232,240,0.08)'}`,
          cursor: connecting || selected === null ? 'default' : 'pointer',
        }}
      >
        {connecting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            CREATING YOUR JOURNEY…
          </span>
        ) : 'SYNC & CREATE JOURNEY →'}
      </motion.button>

      {error && (
        <p className="font-inter text-xs text-center mt-4" style={{ color: '#FF6B6B' }}>{error}</p>
      )}
    </motion.div>
  );
}
