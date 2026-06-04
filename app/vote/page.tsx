'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import TopBar from '@/components/TopBar';
import OrinOrb from '@/components/OrinOrb';
import { getFirstName } from '@/lib/student-store';

interface VoteMission {
  id: string;
  question: string;
  projectTitle: string;
  projectDescription: string;
  order: number;
  state?: string; // 'voting' | 'pending_start' | 'skipped'
}

interface JourneyState {
  hasActiveJourney: boolean;
  hasActiveVote: boolean;
  awaitingActivation?: boolean; // vote concluded, winner pending teacher activation
  voteSessionId: string | null;
  voteJourneyId: string | null;
  voteEndsAt: string | null;
  voteMissions: VoteMission[];
}

function formatCountdown(endsAt: string): string {
  const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
  if (diff === 0) return 'VOTE CLOSED';
  const s = Math.floor(diff / 1000) % 60;
  const m = Math.floor(diff / 60_000) % 60;
  const h = Math.floor(diff / 3_600_000) % 24;
  const d = Math.floor(diff / 86_400_000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

const PLANET_COLORS = [
  { glow: '#FF0080', border: 'rgba(255,0,128,0.5)', bg: 'rgba(255,0,128,0.08)', dot: '#FF0080' },
  { glow: '#7C3AED', border: 'rgba(124,58,237,0.5)', bg: 'rgba(124,58,237,0.08)', dot: '#7C3AED' },
  { glow: '#00F5D4', border: 'rgba(0,245,212,0.5)', bg: 'rgba(0,245,212,0.08)', dot: '#00F5D4' },
  { glow: '#FFD600', border: 'rgba(255,214,0,0.5)',  bg: 'rgba(255,214,0,0.08)',  dot: '#FFD600' },
];

export default function VotePage() {
  const router = useRouter();
  const [state, setState] = useState<JourneyState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [previousVoteId, setPreviousVoteId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [firstName] = useState(() => getFirstName() || 'Traveller');
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/student/journey');
      const data: JourneyState & { voteMissions?: VoteMission[] } = await res.json();
      if (data.hasActiveJourney) { router.replace('/landscape'); return; }
      if (!data.hasActiveVote)   { router.replace('/pending-journey'); return; }
      setState({
        hasActiveJourney:   false,
        hasActiveVote:      true,
        awaitingActivation: data.awaitingActivation ?? false,
        voteSessionId:      data.voteSessionId ?? null,
        voteJourneyId:      data.voteJourneyId ?? null,
        voteEndsAt:         data.voteEndsAt ?? null,
        voteMissions:       data.voteMissions ?? [],
      });
    } catch {
      // stay — next poll will retry
    }
  }, [router]);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Check if student already voted in this session
  useEffect(() => {
    if (!state?.voteSessionId) return;
    fetch(`/api/votes?voteSessionId=${state.voteSessionId}`)
      .then(r => r.json())
      .then(({ bigIdeaId }) => {
        if (bigIdeaId) {
          setPreviousVoteId(bigIdeaId);
          setSelectedId(bigIdeaId);
          setConfirmed(true);
        }
      })
      .catch(() => {});
  }, [state?.voteSessionId]);

  // Countdown ticker
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch vote counts whenever session is known
  const loadCounts = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/vote-counts?voteSessionId=${sessionId}`);
      const data = await res.json();
      if (data.counts) setVoteCounts(data.counts);
    } catch {
      // non-critical — counts just won't update
    }
  }, []);

  useEffect(() => {
    if (!state?.voteSessionId) return;
    loadCounts(state.voteSessionId);
  }, [state?.voteSessionId, loadCounts]);

  useSupabaseRealtime({
    journeyId: state?.voteJourneyId ?? null,
    onMissionStateChange: (mission) => {
      if (mission.state === 'active') {
        router.replace('/landscape');
      } else if (mission.state === 'pending_start') {
        // Vote concluded — re-fetch to show awaiting-activation state without page refresh.
        load();
      }
    },
    onVoteCast: () => {
      if (state?.voteSessionId) loadCounts(state.voteSessionId);
    },
  });

  // Poll every 60s to pick up deadline edits from the teacher.
  // The realtime hook covers mission state transitions; this covers vote_sessions changes
  // (deadline edit) which have no corresponding mission UPDATE event.
  useEffect(() => {
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  async function submitVote() {
    if (!selectedId || !state?.voteSessionId || submitting) return;
    setSubmitting(true);
    try {
      // studentId comes from the server session — not sent in the body.
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteSessionId: state.voteSessionId, bigIdeaId: selectedId }),
      });
      if (res.ok) {
        setPreviousVoteId(selectedId);
        setConfirmed(true);
        if (state?.voteSessionId) loadCounts(state.voteSessionId);
      }
    } catch {
      // swallow — let student retry
    } finally {
      setSubmitting(false);
    }
  }

  // Treat "awaiting activation" the same as expired for voting purposes —
  // the vote window is closed, students just see results until teacher launches.
  const isExpired = state?.awaitingActivation || (state?.voteEndsAt ? new Date(state.voteEndsAt).getTime() <= Date.now() : false);

  if (!state) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <StarField count={80} seed={42} />
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="text-[10px] tracking-[0.3em] font-space uppercase text-white/40"
        >
          SYNCING VOTE DATA…
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative min-h-screen bg-black overflow-hidden flex flex-col"
    >
      <StarField count={120} seed={77} />

      {/* Nebula background */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          inset: '-25%',
          background: 'radial-gradient(ellipse at 60% 40%, rgba(124,58,237,0.10) 0%, rgba(255,0,128,0.05) 40%, transparent 65%)',
        }}
        animate={{ x: ['-4%', '4%', '-4%'], y: ['-3%', '3%', '-3%'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
        <div className="scan-line" />
      </div>

      <TopBar left="MISSION SELECTION · VOTE" />

      <div className="relative z-10 flex-1 flex flex-col items-center pt-20 pb-10 px-5 gap-6 max-w-2xl mx-auto w-full">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center"
        >
          <p className="font-caveat text-3xl text-white/80 mb-1">
            Choose your mission, {firstName}.
          </p>
          <p className="text-[10px] tracking-[0.28em] font-space uppercase text-white/30">
            YOUR VOTE SHAPES THE JOURNEY
          </p>
        </motion.div>

        {/* Countdown strip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          className="flex items-center gap-3 px-5 py-2.5 rounded-full"
          style={{
            background: state.awaitingActivation
              ? 'rgba(0,245,212,0.06)'
              : isExpired ? 'rgba(255,0,128,0.08)' : 'rgba(0,245,212,0.06)',
            border: `1px solid ${state.awaitingActivation ? 'rgba(0,245,212,0.3)' : isExpired ? 'rgba(255,0,128,0.25)' : 'rgba(0,245,212,0.2)'}`,
          }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: state.awaitingActivation ? '#00F5D4' : isExpired ? '#FF0080' : '#00F5D4',
              boxShadow: `0 0 8px ${state.awaitingActivation ? '#00F5D4' : isExpired ? '#FF0080' : '#00F5D4'}`,
            }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="font-space text-xs tracking-[0.18em] uppercase" style={{ color: state.awaitingActivation ? '#00F5D4' : isExpired ? '#FF0080' : '#00F5D4' }}>
            {state.awaitingActivation
              ? 'WINNER CHOSEN · AWAITING LAUNCH'
              : isExpired ? 'VOTE CLOSED' : `CLOSES IN ${state.voteEndsAt ? formatCountdown(state.voteEndsAt) : '…'}`}
          </span>
          {/* force re-render on tick */}
          <span className="hidden">{tick}</span>
        </motion.div>

        {/* Orin hint */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
          className="flex items-start gap-3 w-full px-4 py-3 rounded-xl"
          style={{ background: 'rgba(0,245,212,0.03)', border: '1px solid rgba(0,245,212,0.1)' }}
        >
          <OrinOrb size={28} pulse={false} />
          <p className="text-xs font-inter text-white/45 leading-relaxed">
            Each mission is a different path through history. Pick the one that calls to you — your class votes together to decide the journey.
          </p>
        </motion.div>

        {/* Mission cards */}
        <div className="flex flex-col gap-4 w-full">
          {state.voteMissions.map((mission, i) => {
            const totalVotes   = Object.values(voteCounts).reduce((s, n) => s + n, 0);
            const col          = PLANET_COLORS[i % PLANET_COLORS.length];
            // When awaiting activation, the winner (pending_start) is "selected"; others are dimmed.
            const isWinner     = state.awaitingActivation && mission.state === 'pending_start';
            const isSelected   = state.awaitingActivation ? isWinner : selectedId === mission.id;
            const wasVoted     = previousVoteId === mission.id;
            const missionVotes = voteCounts[mission.id] ?? 0;
            const votePct      = totalVotes > 0 ? Math.round((missionVotes / totalVotes) * 100) : 0;
            // Non-winner cards are faded when results are shown
            const isLoser      = state.awaitingActivation && mission.state === 'skipped';

            return (
              <motion.button
                key={mission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isLoser ? 0.35 : 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.1, type: 'spring', damping: 22, stiffness: 150 }}
                onClick={() => {
                  if (confirmed || isExpired) return;
                  setSelectedId(isSelected ? null : mission.id);
                }}
                disabled={confirmed || isExpired}
                className="text-left rounded-2xl p-5 transition-all w-full"
                style={{
                  background: isSelected ? col.bg : 'rgba(255,255,255,0.02)',
                  border: `1.5px solid ${isSelected ? col.border : 'rgba(255,255,255,0.07)'}`,
                  boxShadow: isSelected ? `0 0 24px ${col.glow}25` : 'none',
                  cursor: confirmed || isExpired ? 'default' : 'pointer',
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Planet indicator */}
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                    style={{
                      background: isSelected ? `${col.glow}22` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isSelected ? col.border : 'rgba(255,255,255,0.1)'}`,
                      boxShadow: isSelected ? `0 0 12px ${col.glow}55` : 'none',
                    }}
                  >
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ background: isSelected ? col.dot : 'rgba(255,255,255,0.2)' }}
                      animate={isSelected ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 1.8, repeat: Infinity }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p
                        className="text-[9px] tracking-[0.22em] font-space uppercase"
                        style={{ color: isSelected ? col.dot : 'rgba(255,255,255,0.25)' }}
                      >
                        MISSION {String(mission.order).padStart(2, '0')}
                      </p>
                      <div className="flex items-center gap-2">
                        {isWinner && (
                          <span className="text-[9px] tracking-[0.14em] font-space uppercase" style={{ color: col.dot }}>
                            CHOSEN ✦
                          </span>
                        )}
                        {!isWinner && wasVoted && confirmed && (
                          <span className="text-[9px] tracking-[0.14em] font-space uppercase" style={{ color: col.dot }}>
                            YOUR VOTE ✦
                          </span>
                        )}
                        {totalVotes > 0 && (
                          <span
                            className="text-[9px] tracking-[0.1em] font-space tabular-nums"
                            style={{ color: isSelected ? col.dot : 'rgba(255,255,255,0.3)' }}
                          >
                            {missionVotes} vote{missionVotes !== 1 ? 's' : ''} · {votePct}%
                          </span>
                        )}
                      </div>
                    </div>
                    <p
                      className="font-space font-bold text-sm leading-snug mb-2"
                      style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.65)' }}
                    >
                      {mission.question}
                    </p>
                    <p
                      className="font-inter text-xs leading-relaxed"
                      style={{ color: isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)' }}
                    >
                      {mission.projectDescription.length > 120
                        ? `${mission.projectDescription.slice(0, 120)}…`
                        : mission.projectDescription}
                    </p>
                    <p
                      className="mt-2 text-[9px] tracking-[0.18em] font-space uppercase"
                      style={{ color: isSelected ? col.dot : 'rgba(255,255,255,0.2)' }}
                    >
                      PROJECT: {mission.projectTitle}
                    </p>
                    {totalVotes > 0 && (
                      <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: col.glow }}
                          initial={{ width: 0 }}
                          animate={{ width: `${votePct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* CTA — awaiting activation, confirmed, or submit */}
        <AnimatePresence mode="wait">
          {state.awaitingActivation ? (
            <motion.div
              key="awaiting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 160 }}
              className="w-full flex flex-col items-center gap-3"
            >
              <div
                className="w-full py-4 rounded-xl flex items-center justify-center gap-3"
                style={{
                  background: 'rgba(0,245,212,0.06)',
                  border: '1px solid rgba(0,245,212,0.25)',
                }}
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ color: '#00F5D4', fontSize: 18 }}
                >
                  ✦
                </motion.span>
                <p className="font-space font-bold text-sm tracking-[0.12em] text-white">
                  AWAITING MISSION LAUNCH
                </p>
                <motion.span
                  animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  style={{ color: '#00F5D4', fontSize: 18 }}
                >
                  ✦
                </motion.span>
              </div>
              <p className="text-[10px] tracking-[0.2em] font-space uppercase text-white/25">
                Your teacher is about to launch the chosen mission
              </p>
            </motion.div>
          ) : confirmed ? (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 160 }}
              className="w-full flex flex-col items-center gap-3"
            >
              <div
                className="w-full py-4 rounded-xl flex items-center justify-center gap-3"
                style={{
                  background: 'rgba(0,245,212,0.07)',
                  border: '1px solid rgba(0,245,212,0.3)',
                }}
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ color: '#00F5D4', fontSize: 18 }}
                >
                  ✦
                </motion.span>
                <p className="font-space font-bold text-sm tracking-[0.12em] text-white">
                  VOTE LOCKED IN
                </p>
              </div>
              {!isExpired && (
                <p className="text-[10px] tracking-[0.2em] font-space uppercase text-white/25">
                  You can change your vote until the window closes
                </p>
              )}
              {!isExpired && (
                <motion.button
                  onClick={() => setConfirmed(false)}
                  className="text-[10px] tracking-[0.2em] font-space uppercase underline underline-offset-4"
                  style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                  whileHover={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  CHANGE VOTE
                </motion.button>
              )}
            </motion.div>
          ) : (
            <motion.div key="submit" className="w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <motion.button
                onClick={submitVote}
                disabled={!selectedId || submitting || isExpired}
                whileHover={selectedId && !submitting && !isExpired ? { scale: 1.015 } : undefined}
                whileTap={selectedId && !submitting && !isExpired ? { scale: 0.975 } : undefined}
                className="w-full py-4 rounded-xl font-space font-bold text-sm tracking-[0.14em] relative overflow-hidden"
                style={{
                  background: selectedId && !isExpired
                    ? 'linear-gradient(120deg, #FF0080 0%, #7C3AED 50%, #00F5D4 100%)'
                    : 'rgba(255,255,255,0.05)',
                  color: selectedId && !isExpired ? '#fff' : 'rgba(255,255,255,0.25)',
                  border: `1px solid ${selectedId && !isExpired ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: selectedId && !isExpired ? '0 0 30px rgba(255,0,128,0.3)' : 'none',
                  cursor: selectedId && !submitting && !isExpired ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                }}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    SUBMITTING…
                  </span>
                ) : isExpired ? 'VOTE CLOSED' : selectedId ? 'CAST MY VOTE ✦' : 'SELECT A MISSION FIRST'}

                {/* Shimmer effect when active */}
                {selectedId && !isExpired && (
                  <motion.span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.15) 50%, transparent 65%)',
                      backgroundSize: '250% 100%',
                    }}
                    animate={{ backgroundPosition: ['250% 0', '-250% 0'] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex items-center gap-2.5 pb-2"
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: state.awaitingActivation ? '#00F5D4' : '#7C3AED', boxShadow: `0 0 8px ${state.awaitingActivation ? 'rgba(0,245,212,0.9)' : 'rgba(124,58,237,0.9)'}` }}
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.75, 1.25, 0.75] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <p className="text-[9px] tracking-[0.34em] font-space uppercase text-white/25">
            {state.awaitingActivation ? 'MISSION SELECTED · LAUNCH IMMINENT' : 'MISSION SELECTION IN PROGRESS'}
          </p>
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: state.awaitingActivation ? '#00F5D4' : '#7C3AED', boxShadow: `0 0 8px ${state.awaitingActivation ? 'rgba(0,245,212,0.9)' : 'rgba(124,58,237,0.9)'}` }}
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.75, 1.25, 0.75] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
