'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getTeacherId, getCourses, saveCourses, type CourseRecord } from '@/lib/teacher-store';

type MissionStatus = 'INACTIVE' | 'ACTIVE' | 'COMPLETED';

interface Mission {
  id: string;
  question: string;
  projectTitle: string;
  status: MissionStatus;
  order: number;
}

interface Journey {
  id: string;
  title: string;
  googleCourseId: string;
  missions: Mission[];
}

const STATUS_STYLES: Record<MissionStatus, { label: string; color: string; bg: string; dot: string }> = {
  INACTIVE:  { label: 'INACTIVE',   color: 'rgba(232,232,240,0.35)', bg: 'rgba(232,232,240,0.06)', dot: 'rgba(232,232,240,0.3)' },
  ACTIVE:    { label: 'LIVE',        color: '#00D4FF',                bg: 'rgba(0,212,255,0.1)',    dot: '#00D4FF' },
  COMPLETED: { label: 'COMPLETE',   color: '#00F5A0',                bg: 'rgba(0,245,160,0.08)',   dot: '#00F5A0' },
};

export default function TeacherDashboard() {
  const router     = useRouter();
  const [journeys, setJourneys]   = useState<Journey[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [courses,  setCourses]    = useState<CourseRecord[]>([]);

  const fetchJourneys = () => {
    const teacherId = getTeacherId();
    if (!teacherId) return;
    setLoading(true);
    fetch(`/api/teacher/journeys?teacherId=${teacherId}`)
      .then(r => r.json())
      .then(d => { setJourneys(d.journeys ?? []); setLoading(false); })
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
    // Fallback: fetch from DB if localStorage is empty
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

  async function toggleMission(mission: Mission) {
    if (activating) return;
    const nextStatus: MissionStatus =
      mission.status === 'INACTIVE'  ? 'ACTIVE' :
      mission.status === 'ACTIVE'    ? 'COMPLETED' :
      'INACTIVE';

    setActivating(mission.id);
    try {
      const r = await fetch('/api/teacher/missions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId: mission.id, status: nextStatus }),
      });
      if (!r.ok) throw new Error('Server error');

      setJourneys(prev => prev.map(j => ({
        ...j,
        missions: j.missions.map(m => m.id === mission.id ? { ...m, status: nextStatus } : m),
      })));
    } catch {
      // revert — state unchanged, button unlocks
    } finally {
      setActivating(null);
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
        <h1
          className="font-space font-black tracking-[0.12em] mb-1"
          style={{ fontSize: 28, color: '#E8E8F0' }}
        >
          MISSION CONTROL
        </h1>
        <p className="font-inter text-sm" style={{ color: 'rgba(232,232,240,0.4)' }}>
          Activate missions and manage your class journeys
        </p>
      </motion.div>

      {loading ? (
        <div className="flex items-center gap-3 mt-24 justify-center">
          <span className="w-5 h-5 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
          <span className="font-space text-xs tracking-widest text-white/30">LOADING JOURNEYS…</span>
        </div>
      ) : journeys.length === 0 ? (
        <ConnectState courses={courses} onConnected={fetchJourneys} />
      ) : (
        <div className="flex flex-col gap-10">
          {journeys.map((journey, ji) => (
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
                  {journey.missions.length} missions
                </span>
              </div>

              {/* Mission grid */}
              <div className="grid grid-cols-1 gap-3">
                {journey.missions.map((mission, mi) => {
                  const st = STATUS_STYLES[mission.status];
                  return (
                    <motion.div
                      key={mission.id}
                      layout
                      className="relative rounded-xl overflow-hidden cursor-pointer group"
                      style={{
                        background: mission.status === 'ACTIVE'
                          ? 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(124,58,237,0.08) 100%)'
                          : 'rgba(232,232,240,0.03)',
                        border: `1px solid ${mission.status === 'ACTIVE' ? 'rgba(0,212,255,0.25)' : 'rgba(232,232,240,0.08)'}`,
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                      whileHover={{ scale: 1.005 }}
                    >
                      <div className="flex items-center gap-5 px-6 py-5">
                        {/* Order number */}
                        <span
                          className="font-space font-black text-2xl w-8 text-center flex-shrink-0"
                          style={{ color: 'rgba(232,232,240,0.15)' }}
                        >
                          {String(mission.order).padStart(2, '0')}
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-inter text-[11px] mb-1" style={{ color: 'rgba(232,232,240,0.4)' }}>
                            {mission.projectTitle}
                          </p>
                          <p className="font-space font-bold text-sm leading-snug truncate" style={{ color: '#E8E8F0' }}>
                            {mission.question}
                          </p>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center gap-4 flex-shrink-0">
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

                          {/* Action button */}
                          <motion.button
                            onClick={() => {
                              if (mission.status === 'ACTIVE') {
                                router.push(`/teacher/mission/${mission.id}`);
                              } else {
                                toggleMission(mission);
                              }
                            }}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            disabled={activating === mission.id}
                            className="px-4 py-2 rounded-lg text-[10px] font-space font-bold tracking-[0.12em]"
                            style={{
                              background: mission.status === 'INACTIVE'
                                ? 'linear-gradient(120deg, rgba(124,58,237,0.5), rgba(0,212,255,0.3))'
                                : mission.status === 'ACTIVE'
                                ? 'rgba(0,212,255,0.15)'
                                : 'rgba(232,232,240,0.06)',
                              color: mission.status === 'ACTIVE' ? '#00D4FF' : '#E8E8F0',
                              border: `1px solid ${mission.status === 'ACTIVE' ? 'rgba(0,212,255,0.4)' : 'rgba(124,58,237,0.35)'}`,
                              opacity: activating === mission.id ? 0.5 : 1,
                            }}
                          >
                            {activating === mission.id ? '…' :
                              mission.status === 'INACTIVE'  ? 'LAUNCH' :
                              mission.status === 'ACTIVE'    ? 'REVIEW →' :
                              'REOPEN'}
                          </motion.button>
                        </div>
                      </div>

                      {/* Active glow stripe */}
                      {mission.status === 'ACTIVE' && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-0.5"
                          style={{ background: 'linear-gradient(180deg, #00D4FF, #7C3AED)' }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </div>
      )}
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
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(courses.map(c => c.id)),
  );
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleConnect() {
    const chosen = courses.filter(c => selected.has(c.id));
    if (chosen.length === 0) return;
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/teacher/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: getTeacherId(),
          courses: chosen.map(c => ({ id: c.id, name: c.name })),
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center mt-28 gap-4"
      >
        <p className="font-space text-sm tracking-widest" style={{ color: 'rgba(232,232,240,0.4)' }}>
          NO CLASSROOMS DETECTED
        </p>
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
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="max-w-lg mx-auto mt-16"
    >
      {/* Header */}
      <div className="mb-8">
        <h2
          className="font-space font-black tracking-[0.12em] mb-2"
          style={{ fontSize: 20, color: '#E8E8F0' }}
        >
          CONNECT YOUR CLASSES
        </h2>
        <p className="font-inter text-sm" style={{ color: 'rgba(232,232,240,0.4)' }}>
          Select the Google Classroom courses you want to activate in Astroli.
          Each selected class becomes a Journey with 3 pre-built missions.
        </p>
      </div>

      {/* Course list */}
      <div className="flex flex-col gap-3 mb-8">
        {courses.map(course => {
          const isSelected = selected.has(course.id);
          return (
            <button
              key={course.id}
              onClick={() => toggle(course.id)}
              className="flex items-center gap-4 rounded-xl px-5 py-4 text-left transition-all"
              style={{
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(0,212,255,0.06) 100%)'
                  : 'rgba(232,232,240,0.03)',
                border: `1px solid ${isSelected ? 'rgba(124,58,237,0.4)' : 'rgba(232,232,240,0.08)'}`,
              }}
            >
              {/* Checkbox */}
              <div
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: isSelected ? '#7C3AED' : 'transparent',
                  border: `1.5px solid ${isSelected ? '#7C3AED' : 'rgba(232,232,240,0.2)'}`,
                }}
              >
                {isSelected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              {/* Course info */}
              <div className="flex-1 min-w-0">
                <p className="font-space font-bold text-sm truncate" style={{ color: '#E8E8F0' }}>
                  {course.name}
                </p>
                {course.section && (
                  <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(232,232,240,0.35)' }}>
                    {course.section}
                  </p>
                )}
              </div>

              {/* Journey badge */}
              {isSelected && (
                <span
                  className="font-space text-[9px] font-bold tracking-[0.15em] px-2 py-1 rounded flex-shrink-0"
                  style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.3)' }}
                >
                  1 JOURNEY · 3 MISSIONS
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <motion.button
          onClick={handleConnect}
          disabled={connecting || selected.size === 0}
          whileHover={!connecting && selected.size > 0 ? { scale: 1.02 } : undefined}
          whileTap={!connecting && selected.size > 0 ? { scale: 0.97 } : undefined}
          className="flex-1 py-3 rounded-xl font-space font-bold text-sm tracking-[0.12em]"
          style={{
            background: selected.size > 0
              ? 'linear-gradient(120deg, rgba(124,58,237,0.7), rgba(0,212,255,0.4))'
              : 'rgba(232,232,240,0.05)',
            color: selected.size > 0 ? '#E8E8F0' : 'rgba(232,232,240,0.2)',
            border: `1px solid ${selected.size > 0 ? 'rgba(124,58,237,0.5)' : 'rgba(232,232,240,0.08)'}`,
            cursor: connecting || selected.size === 0 ? 'default' : 'pointer',
          }}
        >
          {connecting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              CREATING JOURNEYS…
            </span>
          ) : (
            `CONNECT ${selected.size > 0 ? `${selected.size} CLASS${selected.size > 1 ? 'ES' : ''}` : 'CLASSES'}`
          )}
        </motion.button>
      </div>

      {error && (
        <p className="font-inter text-xs text-center mt-4" style={{ color: '#FF6B6B' }}>
          {error}
        </p>
      )}
    </motion.div>
  );
}
