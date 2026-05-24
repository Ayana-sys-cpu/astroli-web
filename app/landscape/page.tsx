'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import TopBar from '@/components/TopBar';
import OrinOrb from '@/components/OrinOrb';
import Planet from '@/components/Planet';
import MissionOverlay from '@/components/MissionOverlay';
import { useAvatar } from '@/hooks/useAvatar';
import { getFirstName, getBotName, getStudentId } from '@/lib/student-store';
import { useOrinChat } from '@/lib/useOrinChat';
import { getPlantMeta, PLANET_LAYOUT, PLANET_EDGES } from '@/lib/plant-meta';

interface Plant {
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
  plants: Plant[];
}

export default function LandscapePage() {
  const router = useRouter();
  const [orinOpen, setOrinOpen]       = useState(true);
  const [firstName, setFirstName]     = useState('');
  const [botName, setBotName]         = useState('Pip');
  const [mission, setMission]         = useState<Mission | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [ready, setReady]             = useState(false);
  const orin   = useOrinChat('mission_hub', mission?.id, 'mission');
  const avatar = useAvatar();

  useEffect(() => {
    setFirstName(getFirstName() || 'Traveler');
    setBotName(getBotName());
  }, []);

  useEffect(() => {
    const studentId = getStudentId();
    const url = studentId
      ? `/api/student/journey?studentId=${studentId}`
      : '/api/student/journey';

    fetch(url)
      .then(r => r.json())
      .then(({ hasActiveJourney, hasActiveVote, activeMissionId, missionStatus }) => {
        if (!hasActiveJourney) {
          router.replace(hasActiveVote ? '/vote' : '/pending-journey');
          return;
        }
        if (activeMissionId) {
          fetch(`/api/student/mission?missionId=${activeMissionId}`)
            .then(r => r.json())
            .then(({ mission }) => {
              setMission(mission);
              if (!missionStatus) {
                setShowOverlay(true);
                // landscape stays hidden until overlay is accepted
              } else {
                setReady(true);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [router]);

  const handleAcceptMission = () => {
    setShowOverlay(false);
    setReady(true);
    if (mission) {
      const studentId = getStudentId();
      if (studentId) {
        fetch('/api/student/journey', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, missionId: mission.id, status: 'started' }),
        }).catch(() => {});
      }
    }
  };

  const planets = (mission?.plants ?? []).map((p, i) => {
    const meta  = getPlantMeta(p.title);
    const label = p.label ?? meta.label;
    const pos   = PLANET_LAYOUT[i] ?? { x: 50, y: 50 };
    return {
      id: p.id,
      name: label,
      label,
      shortTitle:     p.shortTitle    ?? label,
      planetQuestion: p.planetQuestion ?? meta.question,
      number: String(i + 1).padStart(2, '0'),
      ...pos,
      explored: false,
    };
  });

  const edges        = PLANET_EDGES[planets.length] ?? [];
  const missionLabel = mission ? `MISSION ${String(mission.order).padStart(2, '0')}` : '…';
  const bigIdea      = mission?.question ?? '';

  const suggested = planets.length > 0
    ? planets[Math.floor(Math.random() * planets.length)]
    : null;

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

      <TopBar left={`${missionLabel} · ${bigIdea.toUpperCase()}`} />

      {/* ── Main layout ─────────────────────────────────────────────── */}
      <div className="flex flex-1 pt-14">

        {/* ── Planet field ──────────────────────────────────────────── */}
        <div className="flex-1 relative">
          {planets.map((p) => (
            <Planet
              key={p.id}
              {...p}
              onClick={() => router.push(`/landscape/${p.id}`)}
            />
          ))}
        </div>

        {/* ── Right: guide panel ────────────────────────────────────── */}
        <AnimatePresence>
          {orinOpen && (
            <motion.aside
              key="orin-panel"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ delay: 0.4, type: 'spring', damping: 24, stiffness: 180 }}
              className="panel w-[290px] flex-shrink-0 flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  {avatar.url
                    ? <img
                        src={avatar.url}
                        alt={botName}
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        style={{ border: '1px solid rgba(0,245,212,0.4)', boxShadow: '0 0 8px rgba(0,245,212,0.3)' }}
                      />
                    : <OrinOrb size={28} pulse={false} />}
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

              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                {orin.messages.length === 0 && !orin.loading && (
                  <>
                    <p className="font-caveat text-xl text-white/75 leading-snug">
                      You're in, {firstName}.
                    </p>
                    <div className="flex gap-2.5">
                      <div
                        className="w-0.5 flex-shrink-0 rounded-full mt-0.5"
                        style={{ background: 'rgba(0,245,212,0.2)' }}
                      />
                      <p className="text-xs text-white/50 font-inter leading-relaxed">
                        Each planet is a clue. Ask me anything or tap one to explore.
                      </p>
                    </div>
                    {suggested && (
                      <div>
                        <p className="section-label mb-2">START HERE</p>
                        <motion.div
                          whileHover={{ borderColor: 'rgba(0,245,212,0.35)', x: 2 }}
                          className="flex items-center justify-between px-3 py-2 rounded border cursor-pointer transition-colors"
                          style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
                          onClick={() => router.push(`/landscape/${suggested.id}`)}
                        >
                          <span className="text-xs text-white/50 font-inter">{suggested.label}</span>
                          <span className="text-[9px] text-[#00F5D4]/40 font-space">EXPLORE →</span>
                        </motion.div>
                      </div>
                    )}
                  </>
                )}
                {orin.messages.map((m, i) => (
                  <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {m.role === 'assistant' && (
                      <div
                        className="w-0.5 flex-shrink-0 rounded-full mt-0.5"
                        style={{ background: 'rgba(0,245,212,0.2)' }}
                      />
                    )}
                    <p className={`text-xs font-inter leading-relaxed ${m.role === 'user' ? 'text-white/70 text-right' : 'text-white/50'}`}>
                      {m.content}
                    </p>
                  </div>
                ))}
                {orin.loading && (
                  <div className="flex gap-2.5">
                    <div
                      className="w-0.5 flex-shrink-0 rounded-full mt-0.5"
                      style={{ background: 'rgba(0,245,212,0.2)' }}
                    />
                    <p className="text-xs text-white/25 font-inter animate-pulse">syncing...</p>
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-white/5 flex gap-2">
                <input
                  className="input-dark text-xs flex-1"
                  placeholder={`Ask ${botName} where to start...`}
                  value={orin.input}
                  onChange={(e) => orin.setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && orin.send()}
                />
                <button
                  onClick={() => orin.send()}
                  disabled={orin.loading}
                  className="text-[#00F5D4]/60 hover:text-[#00F5D4] disabled:opacity-30 transition-colors text-sm px-1"
                >
                  →
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {!orinOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setOrinOpen(true)}
            className="absolute bottom-24 right-6 z-30 w-12 h-12 rounded-full overflow-hidden flex-shrink-0 hover:scale-110 transition-transform"
            style={avatar.url ? {
              border: '1px solid rgba(0,245,212,0.5)',
              boxShadow: '0 0 20px rgba(0,245,212,0.4)',
            } : {}}
            title={`Talk to ${botName}`}
          >
            {avatar.url
              ? <img src={avatar.url} alt={botName} className="w-full h-full object-cover" />
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
