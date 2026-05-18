'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Plant {
  id: string;
  title: string;
  content: string;
}

interface Mission {
  id: string;
  question: string;
  questionDescription: string | null;
  projectTitle: string;
  projectDescription: string | null;
  order: number;
  status: string;
  plants: Plant[];
}

type TimerMode = 'countdown' | 'manual';

function VoteSetupInner() {
  const router       = useRouter();
  const params       = useSearchParams();
  const journeyId    = params.get('journeyId') ?? '';

  const [missions,   setMissions]   = useState<Mission[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [studentViewMission, setStudentViewMission] = useState<Mission | null>(null);

  const [timerMode,  setTimerMode]  = useState<TimerMode>('countdown');
  const [duration,   setDuration]   = useState(3);
  const [starting,   setStarting]   = useState(false);
  const [voteActive, setVoteActive] = useState(false);
  const [voteEndIso, setVoteEndIso] = useState('');
  const [copied,     setCopied]     = useState(false);
  const [,           setTick]       = useState(0);

  useEffect(() => {
    if (!journeyId) return;
    fetch(`/api/teacher/missions?journeyId=${journeyId}`)
      .then(r => r.json())
      .then(d => { setMissions(d.missions ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [journeyId]);

  useEffect(() => {
    if (!voteActive) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [voteActive]);

  function formatCountdown(endIso: string): string {
    const diff = Math.max(0, new Date(endIso).getTime() - Date.now());
    const s = Math.floor(diff / 1000) % 60;
    const m = Math.floor(diff / 60000) % 60;
    const h = Math.floor(diff / 3600000) % 24;
    const d = Math.floor(diff / 86400000);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function toggleExpand(id: string) {
    setExpanded(prev => prev === id ? null : id);
  }

  async function startVote() {
    if (starting || missions.length === 0) return;
    setStarting(true);
    try {
      const endMs =
        timerMode === 'countdown'
          ? Date.now() + duration * 60 * 1000
          : Date.now() + 48 * 60 * 60 * 1000;
      setVoteEndIso(new Date(endMs).toISOString());
      setVoteActive(true);
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <span className="w-5 h-5 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
        <span className="font-space text-xs tracking-widest text-white/30">LOADING MISSIONS…</span>
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-8 font-space text-[11px] tracking-widest transition-colors"
        style={{ color: 'rgba(232,232,240,0.35)' }}
      >
        ← MISSION CONTROL
      </button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-space font-black tracking-[0.1em] mb-2" style={{ fontSize: 24, color: '#E8E8F0' }}>
          🗳️ START A CLASS VOTE
        </h1>
        <p className="font-inter text-sm" style={{ color: 'rgba(232,232,240,0.45)' }}>
          All {missions.length} missions go to a vote — your class picks their first mission together. Review each brief below, then open the vote.
        </p>
      </motion.div>

      {/* ── STEP 1: REVIEW MISSIONS ── */}
      <div className="mb-8">
        <p className="font-space text-[10px] tracking-[0.2em] mb-4" style={{ color: 'rgba(232,232,240,0.35)' }}>
          STEP 1 — REVIEW MISSIONS
        </p>

        <div className="flex flex-col gap-3">
          {missions.map(mission => {
            const isExp = expanded === mission.id;

            return (
              <motion.div
                key={mission.id}
                layout
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'rgba(232,232,240,0.03)',
                  border: '1px solid rgba(232,232,240,0.08)',
                }}
              >
                {/* Card header */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Order */}
                  <span className="font-space font-black text-xl w-7 flex-shrink-0" style={{ color: 'rgba(232,232,240,0.15)' }}>
                    {String(mission.order).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-inter text-[11px] mb-0.5" style={{ color: 'rgba(232,232,240,0.4)' }}>
                      {mission.projectTitle}
                    </p>
                    <p className="font-space font-bold text-sm leading-snug" style={{ color: '#E8E8F0' }}>
                      {mission.question}
                    </p>
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => toggleExpand(mission.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-space text-[10px] font-bold tracking-[0.1em] flex-shrink-0 transition-all"
                    style={{
                      background: 'rgba(232,232,240,0.05)',
                      color: 'rgba(232,232,240,0.45)',
                      border: '1px solid rgba(232,232,240,0.1)',
                    }}
                  >
                    ACTIVITIES
                    <span style={{ transform: isExp ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
                  </button>
                </div>

                {/* Mission brief — always visible */}
                {mission.questionDescription && (
                  <div className="px-5 pb-4 -mt-1">
                    <p className="font-inter text-xs leading-relaxed" style={{ color: 'rgba(232,232,240,0.4)' }}>
                      {mission.questionDescription}
                    </p>
                  </div>
                )}
                {mission.projectDescription && (
                  <div className="mx-5 mb-4 rounded-lg px-4 py-3" style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)' }}>
                    <p className="font-space text-[9px] tracking-[0.2em] mb-1" style={{ color: '#7C3AED' }}>STUDENT PROJECT</p>
                    <p className="font-inter text-xs leading-relaxed" style={{ color: 'rgba(232,232,240,0.5)' }}>
                      {mission.projectDescription}
                    </p>
                  </div>
                )}

                {/* Expandable: student activities + student view */}
                <AnimatePresence initial={false}>
                  {isExp && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        className="mx-5 mb-4 rounded-xl p-4 flex flex-col gap-3"
                        style={{ background: 'rgba(232,232,240,0.02)', border: '1px solid rgba(232,232,240,0.07)' }}
                      >
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
                                  {plant.content.slice(0, 120)}{plant.content.length > 120 ? '…' : ''}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Student view button */}
                        <button
                          onClick={() => setStudentViewMission(mission)}
                          className="w-full py-2.5 rounded-lg font-space text-[10px] font-bold tracking-[0.12em] transition-all"
                          style={{
                            background: 'rgba(0,212,255,0.05)',
                            color: '#00D4FF',
                            border: '1px dashed rgba(0,212,255,0.3)',
                          }}
                        >
                          👩‍🎓 PREVIEW STUDENT VIEW →
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── STEP 2: TIMER ── */}
      <div className={`max-w-sm mb-8${voteActive ? ' opacity-0 pointer-events-none select-none h-0 overflow-hidden mb-0' : ''}`}>
        <p className="font-space text-[10px] tracking-[0.2em] mb-3" style={{ color: 'rgba(232,232,240,0.35)' }}>
          STEP 2 — VOTE DURATION
        </p>
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(232,232,240,0.03)', border: '1px solid rgba(232,232,240,0.08)' }}>
          {/* Countdown */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(232,232,240,0.06)' }}>
            <button className="flex items-center gap-2 text-left" onClick={() => setTimerMode('countdown')}>
              <div className="flex items-center justify-center" style={{ width: 15, height: 15, borderRadius: '50%', border: `1.5px solid ${timerMode === 'countdown' ? '#7C3AED' : 'rgba(232,232,240,0.2)'}`, background: timerMode === 'countdown' ? 'rgba(124,58,237,0.18)' : 'transparent' }}>
                {timerMode === 'countdown' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C3AED' }} />}
              </div>
              <div>
                <p className="font-space font-bold text-xs" style={{ color: '#E8E8F0' }}>Countdown timer</p>
                <p className="font-inter text-[10px]" style={{ color: 'rgba(232,232,240,0.35)' }}>Closes automatically</p>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setDuration(d => Math.max(1, d - 1))} className="w-6 h-6 rounded font-bold text-sm flex items-center justify-center" style={{ background: 'rgba(232,232,240,0.06)', border: '1px solid rgba(232,232,240,0.1)', color: 'rgba(232,232,240,0.6)' }}>−</button>
              <span className="font-space font-bold text-sm w-6 text-center" style={{ color: '#E8E8F0' }}>{duration}</span>
              <button onClick={() => setDuration(d => Math.min(10, d + 1))} className="w-6 h-6 rounded font-bold text-sm flex items-center justify-center" style={{ background: 'rgba(232,232,240,0.06)', border: '1px solid rgba(232,232,240,0.1)', color: 'rgba(232,232,240,0.6)' }}>+</button>
              <span className="font-inter text-[10px]" style={{ color: 'rgba(232,232,240,0.35)' }}>min</span>
            </div>
          </div>
          {/* Manual */}
          <div className="px-4 py-3">
            <button className="flex items-center gap-2 text-left" onClick={() => setTimerMode('manual')}>
              <div className="flex items-center justify-center" style={{ width: 15, height: 15, borderRadius: '50%', border: `1.5px solid ${timerMode === 'manual' ? '#7C3AED' : 'rgba(232,232,240,0.2)'}`, background: timerMode === 'manual' ? 'rgba(124,58,237,0.18)' : 'transparent' }}>
                {timerMode === 'manual' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C3AED' }} />}
              </div>
              <div>
                <p className="font-space font-bold text-xs" style={{ color: '#E8E8F0' }}>Manual close</p>
                <p className="font-inter text-[10px]" style={{ color: 'rgba(232,232,240,0.35)' }}>You close it yourself</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Preview banner */}
      <div
        className={`rounded-xl px-5 py-4 mb-6${voteActive ? ' hidden' : ''}`}
        style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.2)' }}
      >
        <p className="font-inter text-xs leading-relaxed" style={{ color: 'rgba(232,232,240,0.55)' }}>
          🗳️ <span style={{ color: '#E8E8F0', fontWeight: 600 }}>Ready to open the vote.</span>{' '}
          All {missions.length} missions will appear as options. Students vote and the winning mission becomes Mission 1 of the journey.
          {' '}Timer: <span style={{ color: '#E8E8F0', fontWeight: 600 }}>{timerMode === 'countdown' ? `${duration} min countdown` : 'manual close'}</span>.
          {' '}Ties are broken randomly.
        </p>
      </div>

      {/* Actions / Active vote state */}
      {voteActive ? (
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
              {formatCountdown(voteEndIso)}
            </p>
          </div>

          {/* Share button with tooltip */}
          <div className="relative group">
            <motion.button
              onClick={() => {
                const msg = `Hey students! Please download the app using the link below and vote on what you want to do in our upcoming class!\n\nDownload link: [INSERT_LINK_PLACEHOLDER]`;
                navigator.clipboard.writeText(msg).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              }}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.975 }}
              className="w-full py-3.5 rounded-xl font-space font-bold text-sm tracking-[0.12em] flex items-center justify-center gap-2"
              style={{
                background: copied
                  ? 'linear-gradient(120deg, rgba(0,245,160,0.7), rgba(0,212,255,0.5))'
                  : 'linear-gradient(120deg, rgba(37,211,102,0.7), rgba(0,212,255,0.5))',
                color: '#E8E8F0',
                border: `1px solid ${copied ? 'rgba(0,245,160,0.5)' : 'rgba(37,211,102,0.5)'}`,
                boxShadow: '0 4px 20px rgba(37,211,102,0.2)',
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ COPIED!' : '📲 SHARE WITH STUDENTS'}
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
      ) : (
        <div className="flex gap-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 rounded-xl font-space font-bold text-sm tracking-[0.1em]"
            style={{ background: 'rgba(232,232,240,0.04)', color: 'rgba(232,232,240,0.4)', border: '1px solid rgba(232,232,240,0.08)' }}
          >
            CANCEL
          </button>
          <motion.button
            onClick={startVote}
            disabled={starting || missions.length === 0}
            whileHover={!starting && missions.length > 0 ? { scale: 1.02 } : undefined}
            whileTap={!starting && missions.length > 0 ? { scale: 0.97 } : undefined}
            className="flex-1 py-3 rounded-xl font-space font-bold text-sm tracking-[0.12em]"
            style={{
              background: 'linear-gradient(120deg, rgba(124,58,237,0.8), rgba(0,212,255,0.5))',
              color: '#E8E8F0',
              border: '1px solid rgba(124,58,237,0.5)',
              cursor: starting ? 'default' : 'pointer',
            }}
          >
            {starting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                STARTING VOTE…
              </span>
            ) : (
              '🗳️ START VOTE NOW'
            )}
          </motion.button>
        </div>
      )}

      {/* ── STUDENT VIEW OVERLAY ── */}
      <AnimatePresence>
        {studentViewMission && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={() => setStudentViewMission(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex flex-col overflow-hidden"
              style={{
                width: 320,
                maxHeight: '86vh',
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
                {/* Mission hero */}
                <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(0,212,255,0.08))', border: '1px solid rgba(124,58,237,0.3)' }}>
                  <p className="font-space font-black text-base mb-1" style={{ color: '#E8E8F0' }}>
                    {studentViewMission.projectTitle}
                  </p>
                  <p className="font-inter text-xs mb-3" style={{ color: 'rgba(232,232,240,0.45)' }}>
                    US History · Mission option {studentViewMission.order}
                  </p>
                  {studentViewMission.questionDescription && (
                    <p className="font-inter text-xs leading-relaxed text-left" style={{ color: 'rgba(232,232,240,0.5)', borderTop: '1px solid rgba(124,58,237,0.2)', paddingTop: 12 }}>
                      {studentViewMission.questionDescription}
                    </p>
                  )}
                </div>

                {/* Big question */}
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(232,232,240,0.03)', border: '1px solid rgba(232,232,240,0.07)' }}>
                  <p className="font-space text-[9px] tracking-[0.2em] mb-1.5" style={{ color: 'rgba(232,232,240,0.35)' }}>BIG QUESTION</p>
                  <p className="font-space font-bold text-sm leading-snug" style={{ color: '#E8E8F0' }}>
                    {studentViewMission.question}
                  </p>
                </div>

                {/* Locked planets */}
                <div>
                  <p className="font-space text-[9px] tracking-[0.2em] mb-2" style={{ color: 'rgba(232,232,240,0.3)' }}>
                    YOUR PLANETS TO EXPLORE
                  </p>
                  <div className="flex flex-col gap-2">
                    {studentViewMission.plants.map((plant, pi) => (
                      <div
                        key={plant.id}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                        style={{
                          background: 'rgba(232,232,240,0.03)',
                          border: '1px solid rgba(232,232,240,0.07)',
                          opacity: pi === 0 ? 1 : 0.45,
                        }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: pi === 0 ? 'rgba(124,58,237,0.3)' : 'rgba(232,232,240,0.05)', border: `1px solid ${pi === 0 ? 'rgba(124,58,237,0.5)' : 'rgba(232,232,240,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: pi === 0 ? '#A78BFA' : 'rgba(232,232,240,0.3)' }}>🪐</span>
                        </div>
                        <p className="font-space font-bold text-xs" style={{ color: pi === 0 ? '#E8E8F0' : 'rgba(232,232,240,0.4)' }}>
                          {plant.title}
                        </p>
                        {pi === 0 && (
                          <span className="ml-auto font-space text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.3)' }}>
                            START
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-4 flex flex-col gap-2 items-center" style={{ background: 'rgba(232,232,240,0.02)', borderTop: '1px solid rgba(232,232,240,0.07)' }}>
                <p className="font-space text-[9px] tracking-[0.15em]" style={{ color: 'rgba(232,232,240,0.25)' }}>
                  👩‍🎓 STUDENT MOBILE VIEW — PREVIEW ONLY
                </p>
                <button
                  onClick={() => setStudentViewMission(null)}
                  className="px-6 py-2 rounded-lg font-space text-[10px] font-bold tracking-[0.1em] transition-all"
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

export default function VoteSetupPage() {
  return (
    <Suspense>
      <VoteSetupInner />
    </Suspense>
  );
}
