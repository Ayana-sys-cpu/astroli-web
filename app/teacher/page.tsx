'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getTeacherId, getCourses, saveCourses, type CourseRecord } from '@/lib/teacher-store';

type MissionStatus = 'INACTIVE' | 'ACTIVE' | 'COMPLETED';

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
  status: MissionStatus;
  order: number;
  plants?: Plant[];
}

interface Journey {
  id: string;
  title: string;
  googleCourseId: string;
  missions: Mission[];
}

const STATUS_STYLES: Record<MissionStatus, { label: string; color: string; bg: string; dot: string }> = {
  INACTIVE:  { label: 'INACTIVE',  color: 'rgba(232,232,240,0.35)', bg: 'rgba(232,232,240,0.06)', dot: 'rgba(232,232,240,0.3)' },
  ACTIVE:    { label: 'LIVE',      color: '#00D4FF',                bg: 'rgba(0,212,255,0.1)',    dot: '#00D4FF' },
  COMPLETED: { label: 'COMPLETE',  color: '#00F5A0',                bg: 'rgba(0,245,160,0.08)',   dot: '#00F5A0' },
};

function formatDT(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatCountdown(endIso: string): string {
  const diff = Math.max(0, new Date(endIso).getTime() - Date.now());
  const s = Math.floor(diff / 1000) % 60;
  const m = Math.floor(diff / 60000) % 60;
  const h = Math.floor(diff / 3600000) % 24;
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
  const [voteStart,    setVoteStart]    = useState(() => formatDT(new Date()));
  const [voteEnd,      setVoteEnd]      = useState(() => formatDT(new Date(Date.now() + 48 * 60 * 60 * 1000)));
  const [starting,     setStarting]     = useState(false);
  const [voteActiveMap, setVoteActiveMap] = useState<Record<string, string>>({});
  const [copiedId,      setCopiedId]      = useState<string | null>(null);
  const [,              setTick]          = useState(0);

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
        loaded.forEach(journey => {
          fetch(`/api/teacher/missions?journeyId=${journey.id}`)
            .then(r => r.json())
            .then(md => {
              setFullMissions(prev => ({ ...prev, [journey.id]: md.missions ?? [] }));
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

  // Restore persisted vote end times from localStorage when journeys load.
  // Rule: a mission must never be ACTIVE while a vote is running, and must
  // never be ACTIVE if it was set by the old Phase-0 shortcut (no localStorage
  // entry). Both cases reset the offending mission back to INACTIVE.
  useEffect(() => {
    if (journeys.length === 0) return;
    const restored: Record<string, string> = {};
    journeys.forEach(j => {
      const stored = localStorage.getItem(`voteEnd_${j.id}`);
      const ms = fullMissions[j.id] ?? j.missions;
      const activeMission = ms.find(m => m.status === 'ACTIVE');
      if (stored) {
        restored[j.id] = stored;
        // Vote is live — no mission may be ACTIVE during a vote
        if (activeMission) {
          fetch('/api/teacher/missions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ missionId: activeMission.id, status: 'INACTIVE' }),
          }).then(() => fetchJourneys()).catch(() => {});
        }
      } else {
        // No active vote — reset any orphaned ACTIVE missions
        if (activeMission) {
          fetch('/api/teacher/missions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ missionId: activeMission.id, status: 'INACTIVE' }),
          }).then(() => fetchJourneys()).catch(() => {});
        }
      }
    });
    if (Object.keys(restored).length > 0) {
      setVoteActiveMap(prev => ({ ...prev, ...restored }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeys]);

  useEffect(() => {
    if (Object.keys(voteActiveMap).length === 0) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [voteActiveMap]);

  async function toggleMission(mission: Mission) {
    if (activating) return;
    const nextStatus: MissionStatus =
      mission.status === 'INACTIVE' ? 'ACTIVE' :
      mission.status === 'ACTIVE'   ? 'COMPLETED' :
      'INACTIVE';
    setActivating(mission.id);
    try {
      const r = await fetch('/api/teacher/missions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId: mission.id, status: nextStatus }),
      });
      if (!r.ok) throw new Error('Server error');
      const update = (ms: Mission[]) => ms.map(m => m.id === mission.id ? { ...m, status: nextStatus } : m);
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

  async function startVote(journeyId: string) {
    if (starting) return;
    setStarting(true);
    try {
      localStorage.setItem(`voteEnd_${journeyId}`, voteEnd);
      setVoteActiveMap(prev => ({ ...prev, [journeyId]: voteEnd }));
    } finally {
      setStarting(false);
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
            const missions    = fullMissions[journey.id] ?? journey.missions;
            const allInactive = missions.every(m => m.status === 'INACTIVE');
            const hasActive   = missions.some(m => m.status === 'ACTIVE');
            const voteIsLive  = Boolean(voteActiveMap[journey.id]);

            return (
              <motion.section
                key={journey.id}
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
                    const st    = STATUS_STYLES[mission.status];
                    const isExp = expanded === mission.id;

                    return (
                      <motion.div
                        key={mission.id}
                        layout
                        className="relative rounded-xl overflow-hidden"
                        style={{
                          background: mission.status === 'ACTIVE'
                            ? 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(124,58,237,0.08) 100%)'
                            : isExp
                            ? 'rgba(232,232,240,0.04)'
                            : 'rgba(232,232,240,0.03)',
                          border: `1px solid ${
                            mission.status === 'ACTIVE'
                              ? 'rgba(0,212,255,0.25)'
                              : isExp
                              ? 'rgba(232,232,240,0.13)'
                              : 'rgba(232,232,240,0.08)'
                          }`,
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
                            <p className="font-space font-bold text-sm leading-snug truncate" style={{ color: '#E8E8F0' }}>
                              {mission.question}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {/* Status badge */}
                            <div
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-space font-bold tracking-[0.15em]"
                              style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}40` }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: st.dot, boxShadow: mission.status === 'ACTIVE' ? `0 0 6px ${st.dot}` : 'none' }}
                              />
                              {st.label}
                            </div>
                            {/* REVIEW for active */}
                            {mission.status === 'ACTIVE' && (
                              <motion.button
                                onClick={e => { e.stopPropagation(); router.push(`/teacher/mission/${mission.id}`); }}
                                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                className="px-4 py-2 rounded-lg text-[10px] font-space font-bold tracking-[0.12em]"
                                style={{ background: 'rgba(0,212,255,0.15)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.4)' }}
                              >
                                REVIEW →
                              </motion.button>
                            )}
                            {/* REOPEN for completed — blocked while vote is live */}
                            {mission.status === 'COMPLETED' && (
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

                        {/* Active glow stripe */}
                        {mission.status === 'ACTIVE' && (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: 'linear-gradient(180deg, #00D4FF, #7C3AED)' }} />
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Vote setup — active state (countdown + share) or setup form */}
                {voteActiveMap[journey.id] ? (
                  <motion.div
                    key="vote-active"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-6"
                    style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)' }}
                  >
                    {/* Live badge */}
                    <div className="flex items-center gap-2 mb-5">
                      <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: '#00D4FF', boxShadow: '0 0 8px #00D4FF' }}
                      />
                      <p className="font-space text-[10px] tracking-[0.2em]" style={{ color: '#00D4FF' }}>
                        VOTE IS LIVE
                      </p>
                    </div>

                    {/* Countdown */}
                    <div className="text-center mb-6">
                      <p className="font-space text-[9px] tracking-[0.2em] mb-2" style={{ color: 'rgba(232,232,240,0.35)' }}>
                        CLOSES IN
                      </p>
                      <p className="font-space font-black text-4xl tracking-wider" style={{ color: '#E8E8F0' }}>
                        {voteActiveMap[journey.id] ? formatCountdown(voteActiveMap[journey.id]) : '—'}
                      </p>
                    </div>

                    {/* Share button with tooltip */}
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
                  </motion.div>
                ) : allInactive ? (
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

                    <p className="font-inter text-[11px] mb-5" style={{ color: 'rgba(232,232,240,0.3)' }}>
                      Default: 48 hours from now · Ties are broken randomly
                    </p>

                    <motion.button
                      onClick={() => startVote(journey.id)}
                      disabled={starting}
                      whileHover={!starting ? { scale: 1.015 } : undefined}
                      whileTap={!starting ? { scale: 0.975 } : undefined}
                      className="w-full py-3.5 rounded-xl font-space font-bold text-sm tracking-[0.12em]"
                      style={{
                        background: 'linear-gradient(120deg, rgba(124,58,237,0.8), rgba(0,212,255,0.5))',
                        color: '#E8E8F0',
                        border: '1px solid rgba(124,58,237,0.5)',
                        boxShadow: '0 4px 20px rgba(124,58,237,0.25)',
                        cursor: starting ? 'default' : 'pointer',
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
            );
          })}
        </div>
      )}

      {/* Student view overlay */}
      <AnimatePresence>
        {studentView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
            onClick={() => setStudentView(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex flex-col overflow-hidden"
              style={{
                width: 320, maxHeight: '86vh',
                background: '#0A0A0F',
                borderRadius: 28,
                border: '2px solid rgba(232,232,240,0.1)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Notch */}
              <div className="flex items-center justify-center py-3" style={{ background: 'rgba(232,232,240,0.03)' }}>
                <div style={{ width: 72, height: 5, borderRadius: 3, background: 'rgba(232,232,240,0.12)' }} />
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4" style={{ paddingTop: 16 }}>
                <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(0,212,255,0.08))', border: '1px solid rgba(124,58,237,0.3)' }}>
                  <p className="font-space font-black text-base mb-1" style={{ color: '#E8E8F0' }}>
                    {studentView.projectTitle}
                  </p>
                  <p className="font-inter text-xs mb-3" style={{ color: 'rgba(232,232,240,0.45)' }}>
                    Mission option {studentView.order}
                  </p>
                  {studentView.questionDescription && (
                    <p className="font-inter text-xs leading-relaxed text-left" style={{ color: 'rgba(232,232,240,0.5)', borderTop: '1px solid rgba(124,58,237,0.2)', paddingTop: 12 }}>
                      {studentView.questionDescription}
                    </p>
                  )}
                </div>

                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(232,232,240,0.03)', border: '1px solid rgba(232,232,240,0.07)' }}>
                  <p className="font-space text-[9px] tracking-[0.2em] mb-1.5" style={{ color: 'rgba(232,232,240,0.35)' }}>BIG QUESTION</p>
                  <p className="font-space font-bold text-sm leading-snug" style={{ color: '#E8E8F0' }}>{studentView.question}</p>
                </div>

                {studentView.plants && studentView.plants.length > 0 && (
                  <div>
                    <p className="font-space text-[9px] tracking-[0.2em] mb-2" style={{ color: 'rgba(232,232,240,0.3)' }}>
                      YOUR PLANETS TO EXPLORE
                    </p>
                    <div className="flex flex-col gap-2">
                      {studentView.plants.map((plant, pi) => (
                        <div
                          key={plant.id}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                          style={{ background: 'rgba(232,232,240,0.03)', border: '1px solid rgba(232,232,240,0.07)', opacity: pi === 0 ? 1 : 0.45 }}
                        >
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: pi === 0 ? 'rgba(124,58,237,0.3)' : 'rgba(232,232,240,0.05)', border: `1px solid ${pi === 0 ? 'rgba(124,58,237,0.5)' : 'rgba(232,232,240,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: pi === 0 ? '#A78BFA' : 'rgba(232,232,240,0.3)' }}>🪐</span>
                          </div>
                          <p className="font-space font-bold text-xs" style={{ color: pi === 0 ? '#E8E8F0' : 'rgba(232,232,240,0.4)' }}>{plant.title}</p>
                          {pi === 0 && (
                            <span className="ml-auto font-space text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.3)' }}>
                              START
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-4 flex flex-col gap-2 items-center" style={{ background: 'rgba(232,232,240,0.02)', borderTop: '1px solid rgba(232,232,240,0.07)' }}>
                <p className="font-space text-[9px] tracking-[0.15em]" style={{ color: 'rgba(232,232,240,0.25)' }}>
                  👩‍🎓 STUDENT MOBILE VIEW — PREVIEW ONLY
                </p>
                <button
                  onClick={() => setStudentView(null)}
                  className="px-6 py-2 rounded-lg font-space text-[10px] font-bold tracking-[0.1em]"
                  style={{ background: 'rgba(232,232,240,0.05)', color: 'rgba(232,232,240,0.5)', border: '1px solid rgba(232,232,240,0.1)' }}
                >
                  CLOSE PREVIEW
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
      onConnected();
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
