'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import TopBar from '@/components/TopBar';
import OrinOrb from '@/components/OrinOrb';
import AvatarHero from '@/components/AvatarHero';
import ControlPortal from '@/components/ControlPortal';
import Planet from '@/components/Planet';
import { useAvatar } from '@/hooks/useAvatar';
import { getFirstName } from '@/lib/student-store';
import { useOrinChat } from '@/lib/useOrinChat';
import { PLANETS, MOCK_USER, MOCK_MISSION } from '@/lib/mock-data';

/* Constellation edges between planets */
const EDGES: [number, number][] = [[0, 1], [0, 2], [1, 3], [3, 4], [2, 5]];

const SUGGESTED = ['Gutenberg Bible', 'Royal Decree', 'Protest Pamphlet'];

const exploredCount = PLANETS.filter((p) => p.explored).length;
const portalTasks = [
  {
    id: 'planets',
    label: 'PLANETS TO EXPLORE',
    count: PLANETS.length - exploredCount,
    color: '#00F5D4',
    shadowVal: '0,245,212',
    icon: '◎',
  },
  { id: 'insights',  label: 'INSIGHTS NEEDED',  count: 2, color: '#FF0080', shadowVal: '255,0,128', icon: '✦' },
  { id: 'questions', label: 'OPEN QUESTIONS',    count: 1, color: '#FFD600', shadowVal: '255,214,0', icon: '?' },
];

export default function LandscapePage() {
  const router = useRouter();
  const [orinOpen, setOrinOpen] = useState(true);
  const orin = useOrinChat('mission_hub');
  const avatar = useAvatar();
  const firstName = getFirstName() || MOCK_USER.firstName;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative min-h-screen bg-black overflow-hidden flex flex-col"
    >
      <StarField count={130} seed={55} />

      {/* Constellation lines between planets */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        aria-hidden
      >
        {EDGES.map(([a, b], i) => (
          <motion.line
            key={i}
            x1={`${PLANETS[a].x}%`} y1={`${PLANETS[a].y}%`}
            x2={`${PLANETS[b].x}%`} y2={`${PLANETS[b].y}%`}
            stroke="rgba(0,245,212,0.1)"
            strokeWidth="0.7"
            strokeDasharray="4 6"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 1 + i * 0.2, duration: 0.8 }}
          />
        ))}
      </svg>

      <TopBar />

      {/* ── Main layout ───────────────────────────────────────────── */}
      <div className="flex flex-1 pt-14">

        {/* ── Left sidebar: avatar + control portal ─────────────── */}
        <div className="flex flex-col gap-5 px-5 pt-6 z-10" style={{ width: 260 }}>
          {/* Avatar section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col items-center gap-3"
          >
            <AvatarHero
              level={7}
              trophies={42}
              xpProgress={0.72}
              size={100}
              animate={false}
              avatarUrl={avatar.loading ? undefined : avatar.url}
            />
            <div className="text-center">
              <p className="font-caveat text-2xl text-white/85">{firstName}</p>
              <p className="text-[9px] tracking-[0.3em] text-white/28 font-space uppercase">
                INVESTIGATOR · LV.7
              </p>
            </div>
          </motion.div>

          {/* Big Idea label */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="px-3 py-3 rounded-lg"
            style={{
              background: 'rgba(255,0,128,0.05)',
              border: '1px solid rgba(255,0,128,0.15)',
            }}
          >
            <p className="text-[8px] tracking-[0.28em] text-white/28 font-space uppercase mb-1">
              BIG IDEA
            </p>
            <p className="font-space font-bold text-sm leading-snug text-white/80">
              {MOCK_MISSION.bigIdea}
            </p>
          </motion.div>

          {/* Control portal */}
          <ControlPortal
            tasks={portalTasks}
            missionLabel={MOCK_MISSION.label}
            totalPlanets={PLANETS.length}
            exploredPlanets={exploredCount}
          />
        </div>

        {/* ── Planet field ──────────────────────────────────────── */}
        <div className="flex-1 relative">
          {PLANETS.map((p) => (
            <Planet
              key={p.id}
              {...p}
              onClick={() => router.push(`/landscape/${p.id}`)}
            />
          ))}

          {/* Explored counter (bottom of field) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-6 left-4 flex items-center gap-2"
          >
            <div
              className="w-1 h-1 rounded-full"
              style={{ background: '#00F5D4', boxShadow: '0 0 6px #00F5D4' }}
            />
            <span className="text-[9px] tracking-[0.22em] text-[#00F5D4]/45 font-space uppercase">
              {exploredCount} / {PLANETS.length} PLANETS EXPLORED
            </span>
          </motion.div>
        </div>

        {/* ── Right: Orin guide panel ───────────────────────────── */}
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
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <OrinOrb size={30} pulse={false} />
                  <p className="text-[9px] tracking-[0.2em] text-[#00F5D4]/60 font-space uppercase">
                    ORIN · GUIDE
                  </p>
                </div>
                <button
                  onClick={() => setOrinOpen(false)}
                  className="text-white/18 hover:text-white/60 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>

              {/* Body — live chat messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                {orin.messages.length === 0 && (
                  <>
                    <p className="font-caveat text-xl text-white/75 leading-snug">
                      You're in, {firstName}.
                    </p>
                    <div className="flex gap-2.5">
                      <div className="w-0.5 flex-shrink-0 rounded-full mt-0.5" style={{ background: 'rgba(0,245,212,0.2)' }} />
                      <p className="text-xs text-white/50 font-inter leading-relaxed">
                        Each planet is a clue. Ask me anything or tap one to explore.
                      </p>
                    </div>
                    <div>
                      <p className="section-label mb-2">SUGGESTED FIRST STEPS</p>
                      <div className="flex flex-col gap-1.5">
                        {SUGGESTED.map((s, i) => (
                          <motion.div
                            key={i}
                            whileHover={{ borderColor: 'rgba(0,245,212,0.35)', x: 2 }}
                            className="flex items-center justify-between px-3 py-2 rounded border cursor-pointer transition-colors"
                            style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
                            onClick={() => {
                              const planet = PLANETS.find((p) => p.name === s);
                              if (planet) router.push(`/landscape/${planet.id}`);
                            }}
                          >
                            <span className="text-xs text-white/50 font-inter">{s}</span>
                            <span className="text-[9px] text-[#00F5D4]/40 font-space">EXPLORE →</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {orin.messages.map((m, i) => (
                  <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {m.role === 'assistant' && (
                      <div className="w-0.5 flex-shrink-0 rounded-full mt-0.5" style={{ background: 'rgba(0,245,212,0.2)' }} />
                    )}
                    <p className={`text-xs font-inter leading-relaxed ${m.role === 'user' ? 'text-white/70 text-right' : 'text-white/50'}`}>
                      {m.content}
                    </p>
                  </div>
                ))}
                {orin.loading && (
                  <div className="flex gap-2.5">
                    <div className="w-0.5 flex-shrink-0 rounded-full mt-0.5" style={{ background: 'rgba(0,245,212,0.2)' }} />
                    <p className="text-xs text-white/25 font-inter animate-pulse">syncing...</p>
                  </div>
                )}
              </div>

              {/* Ask input */}
              <div className="px-4 py-3 border-t border-white/5 flex gap-2">
                <input
                  className="input-dark text-xs flex-1"
                  placeholder="Ask Orin where to start..."
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

        {/* Collapsed Orin toggle */}
        {!orinOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setOrinOpen(true)}
            className="absolute bottom-6 right-6 z-10"
          >
            <OrinOrb size={48} pulse />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
