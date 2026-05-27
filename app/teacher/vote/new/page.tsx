'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toDatetimeLocal } from '@/lib/vote-utils';
import Countdown from '@/components/Countdown';
import StudentMobilePreview from '@/components/StudentMobilePreview';
import VoteManageModals from '@/components/VoteManageModals';

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
  state: string;
  plants: Plant[];
}

function VoteSetupInner() {
  const router       = useRouter();
  const params       = useSearchParams();
  const journeyId    = params.get('journeyId') ?? '';

  const [missions,   setMissions]   = useState<Mission[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [studentViewMission, setStudentViewMission] = useState<Mission | null>(null);

  const [startDate,  setStartDate]  = useState(() => toDatetimeLocal(new Date()));
  const [endDate,    setEndDate]    = useState(() => toDatetimeLocal(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)));
  const [starting,   setStarting]   = useState(false);
  const [voteActive, setVoteActive] = useState(false);
  const [voteEndIso, setVoteEndIso] = useState('');
  const [copied,     setCopied]     = useState(false);

  // Vote management modals
  const [editModalOpen,     setEditModalOpen]     = useState(false);
  const [editEndIso,        setEditEndIso]        = useState('');
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [manageLoading,     setManageLoading]     = useState(false);

  useEffect(() => {
    if (!journeyId) { router.replace('/teacher'); return; }
    fetch(`/api/teacher/missions?journeyId=${journeyId}`)
      .then(r => r.json())
      .then(d => { setMissions(d.missions ?? []); setLoading(false); })
      .catch(() => setLoading(false));
    // Restore active vote state from localStorage.
    // The session was created server-side; localStorage is just a UI cache.
    const stored = localStorage.getItem(`voteEnd_${journeyId}`);
    if (stored && new Date(stored).getTime() > Date.now()) {
      setVoteEndIso(stored);
      setVoteActive(true);
    }
  }, [journeyId]);

  function toggleExpand(id: string) {
    setExpanded(prev => prev === id ? null : id);
  }

  async function handleUpdateVoteEnd() {
    if (!editEndIso || !journeyId) return;
    setManageLoading(true);
    try {
      const endIso = new Date(editEndIso).toISOString();
      const res = await fetch('/api/teacher/journeys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId, voteEndsAt: endIso }),
      });
      if (!res.ok) return;
      localStorage.setItem(`voteEnd_${journeyId}`, endIso);
      setVoteEndIso(endIso);
      setEditModalOpen(false);
    } finally {
      setManageLoading(false);
    }
  }

  async function handleFinishVote() {
    if (!journeyId) return;
    setManageLoading(true);
    try {
      const sessionId = localStorage.getItem(`voteSessionId_${journeyId}`);

      // Get winner — skip API call if sessionId is missing (falls back to first-by-order)
      let winnerId: string | null = null;
      if (sessionId) {
        const winnerRes = await fetch(`/api/winner?voteSessionId=${sessionId}`);
        const data = await winnerRes.json();
        winnerId = data.winnerId ?? null;
      }

      const votingMissions = missions.filter(m => m.state === 'voting');
      const resolvedWinnerId: string | null =
        winnerId ?? (votingMissions.sort((a, b) => a.order - b.order)[0]?.id ?? null);

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

      // Only clear localStorage AFTER successful API update
      localStorage.removeItem(`voteEnd_${journeyId}`);
      localStorage.removeItem(`voteSessionId_${journeyId}`);

      // Stay on this page — update UI to show concluded state
      setVoteActive(false);
      setVoteEndIso('');
      // Reload missions to reflect pending_start / skipped states
      const md = await fetch(`/api/teacher/missions?journeyId=${journeyId}`).then(r => r.json());
      setMissions(md.missions ?? []);
      setFinishConfirmOpen(false);
    } catch (err) {
      console.error('[handleFinishVote]', err);
      // Close modal so UI isn't stuck — vote state (voteActive/voteEndIso) unchanged
      setFinishConfirmOpen(false);
    } finally {
      setManageLoading(false);
    }
  }

  async function handleDeleteVote() {
    if (!journeyId) return;
    setManageLoading(true);
    try {
      localStorage.removeItem(`voteEnd_${journeyId}`);
      localStorage.removeItem(`voteSessionId_${journeyId}`);

      await Promise.all([
        fetch('/api/teacher/journeys', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ journeyId, voteEndsAt: null }),
        }),
        ...missions.filter(m => m.state === 'voting').map(m =>
          fetch('/api/teacher/missions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ missionId: m.id, state: 'locked' }),
          })
        ),
      ]);

      setVoteActive(false);
      setVoteEndIso('');
      setDeleteConfirmOpen(false);
      // Reload missions so the setup form shows fresh state
      const md = await fetch(`/api/teacher/missions?journeyId=${journeyId}`).then(r => r.json());
      setMissions(md.missions ?? []);
    } finally {
      setManageLoading(false);
    }
  }

  // Voting gate: need ≥2 votable missions (not completed/active/skipped) and no active mission.
  const votableMissions = missions.filter(m => !['completed', 'active', 'skipped'].includes(m.state));
  const hasActiveMission = missions.some(m => m.state === 'active');
  const canStartVote = votableMissions.length >= 2 && !hasActiveMission;

  async function startVote() {
    if (starting || !canStartVote || !journeyId) return;
    setStarting(true);
    try {
      const startIso = new Date(startDate).toISOString();
      const endIso   = new Date(endDate).toISOString();
      const res = await fetch('/api/teacher/journeys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId, voteStartsAt: startIso, voteEndsAt: endIso }),
      });
      if (!res.ok) { setStarting(false); return; }
      const data = await res.json();
      setVoteEndIso(endIso);
      setVoteActive(true);
      localStorage.setItem(`voteEnd_${journeyId}`, endIso);
      if (data.sessionId) {
        localStorage.setItem(`voteSessionId_${journeyId}`, data.sessionId);
      }
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

      {/* ── STEP 2: VOTE DURATION ── */}
      <div className={`max-w-sm mb-8${voteActive ? ' opacity-0 pointer-events-none select-none h-0 overflow-hidden mb-0' : ''}`}>
        <p className="font-space text-[10px] tracking-[0.2em] mb-3" style={{ color: 'rgba(232,232,240,0.35)' }}>
          STEP 2 — VOTE DURATION
        </p>
        <div className="rounded-xl overflow-hidden flex flex-col gap-0" style={{ background: 'rgba(232,232,240,0.03)', border: '1px solid rgba(232,232,240,0.08)' }}>
          <div className="flex flex-col gap-1 px-4 py-3" style={{ borderBottom: '1px solid rgba(232,232,240,0.06)' }}>
            <label className="font-space text-[9px] font-bold tracking-[0.15em]" style={{ color: 'rgba(232,232,240,0.4)' }}>
              START DATE
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-lg px-3 py-2 font-inter text-sm outline-none"
              style={{ background: 'rgba(232,232,240,0.05)', border: '1px solid rgba(232,232,240,0.1)', color: '#E8E8F0', colorScheme: 'dark' }}
            />
          </div>
          <div className="flex flex-col gap-1 px-4 py-3">
            <label className="font-space text-[9px] font-bold tracking-[0.15em]" style={{ color: 'rgba(232,232,240,0.4)' }}>
              END DATE
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full rounded-lg px-3 py-2 font-inter text-sm outline-none"
              style={{ background: 'rgba(232,232,240,0.05)', border: '1px solid rgba(232,232,240,0.1)', color: '#E8E8F0', colorScheme: 'dark' }}
            />
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
          {votableMissions.length} missions will appear as options. Students vote and the winning mission becomes Mission 1 of the journey.
          {startDate && new Date(startDate) > new Date()
            ? <>{' '}Opens on <span style={{ color: '#E8E8F0', fontWeight: 600 }}>{new Date(startDate).toLocaleString()}</span>.</>
            : ' Opens immediately.'}
          {' '}Closes on <span style={{ color: '#E8E8F0', fontWeight: 600 }}>{endDate ? new Date(endDate).toLocaleString() : '—'}</span>.
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
            <button
              onClick={() => { setEditEndIso(voteEndIso); setEditModalOpen(true); }}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg font-space text-[10px] font-bold tracking-[0.12em] transition-all hover:opacity-80"
              style={{ background: 'rgba(232,232,240,0.07)', color: 'rgba(232,232,240,0.5)', border: '1px solid rgba(232,232,240,0.12)' }}
            >
              ✎ EDIT
            </button>
          </div>

          {/* Countdown */}
          <div className="text-center mb-6">
            <p className="font-space text-[9px] tracking-[0.2em] mb-2" style={{ color: 'rgba(232,232,240,0.35)' }}>
              CLOSES IN
            </p>
            <p className="font-space font-black text-4xl tracking-wider" style={{ color: '#E8E8F0' }}>
              <Countdown endIso={voteEndIso} />
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
        <div className="flex flex-col gap-3">
          {/* Voting gate warning */}
          {!canStartVote && (
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.2)' }}>
              <p className="font-inter text-xs leading-relaxed" style={{ color: 'rgba(255,184,0,0.85)' }}>
                {hasActiveMission
                  ? '⚠️ A mission is already active. End the current mission before starting a vote.'
                  : `⚠️ Voting requires at least 2 available missions. Currently ${votableMissions.length} available.`}
              </p>
            </div>
          )}
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
              disabled={starting || !canStartVote}
              whileHover={!starting && canStartVote ? { scale: 1.02 } : undefined}
              whileTap={!starting && canStartVote ? { scale: 0.97 } : undefined}
              className="flex-1 py-3 rounded-xl font-space font-bold text-sm tracking-[0.12em]"
              style={{
                background: canStartVote
                  ? 'linear-gradient(120deg, rgba(124,58,237,0.8), rgba(0,212,255,0.5))'
                  : 'rgba(232,232,240,0.06)',
                color: canStartVote ? '#E8E8F0' : 'rgba(232,232,240,0.25)',
                border: canStartVote ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(232,232,240,0.08)',
                cursor: starting || !canStartVote ? 'default' : 'pointer',
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
        </div>
      )}

      <VoteManageModals
        editOpen={editModalOpen}
        editEndValue={editEndIso}
        onEditEndChange={val => setEditEndIso(val)}
        onEditSave={handleUpdateVoteEnd}
        onEditClose={() => setEditModalOpen(false)}
        onEditOpenFinish={() => { setEditModalOpen(false); setFinishConfirmOpen(true); }}
        onEditOpenDelete={() => { setEditModalOpen(false); setDeleteConfirmOpen(true); }}
        finishOpen={finishConfirmOpen}
        onFinishConfirm={handleFinishVote}
        onFinishClose={() => setFinishConfirmOpen(false)}
        deleteOpen={deleteConfirmOpen}
        onDeleteConfirm={handleDeleteVote}
        onDeleteClose={() => setDeleteConfirmOpen(false)}
        loading={manageLoading}
      />
      <StudentMobilePreview mission={studentViewMission} onClose={() => setStudentViewMission(null)} />
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
