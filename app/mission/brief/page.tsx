'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import TopBar from '@/components/TopBar';
import OrinOrb from '@/components/OrinOrb';
import ConflictOverlay from '@/components/ConflictOverlay';
import { MOCK_MISSION, MEDIUM_OPTIONS, MOCK_USER } from '@/lib/mock-data';
import { useOrinChat } from '@/lib/useOrinChat';

type PanelStep = 'brief' | 'ready';

export default function MissionBriefPage() {
  const router = useRouter();
  const [step, setStep] = useState<PanelStep>('brief');
  const [selectedMedium, setSelectedMedium] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const orin = useOrinChat('big_question');

  const chosenMedium = MEDIUM_OPTIONS.find((m) => m.id === selectedMedium);

  const handleMediumSelect = (id: string) => {
    setSelectedMedium(id);
    setTimeout(() => setConflictOpen(true), 350);
  };

  const handleConflictSelect = (id: string) => {
    setSelectedConflict(id);
    setConflictOpen(false);
    setStep('ready');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen bg-black overflow-hidden flex flex-col"
    >
      <StarField count={70} seed={33} />
      <TopBar />

      {/* Kinetic conflict full-screen overlay */}
      <ConflictOverlay
        isOpen={conflictOpen}
        onSelect={handleConflictSelect}
        onDismiss={() => {
          setConflictOpen(false);
          setStep('ready');
        }}
      />

      <div className="flex flex-1 pt-14 overflow-hidden">
        {/* ── Left — Mission stage ───────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center px-12 gap-5">
          <p className="text-[9px] tracking-[0.3em] text-white/28 font-space uppercase">
            {MOCK_MISSION.label}
          </p>

          <h1
            className="font-space font-black text-center leading-none"
            style={{
              fontSize: 'clamp(44px, 5.5vw, 72px)',
              letterSpacing: '-0.02em',
            }}
          >
            {MOCK_MISSION.bigIdea.split(' ').map((word, i) => (
              <span
                key={i}
                className="inline-block mr-[0.18em]"
                style={{
                  color: i === 1 ? '#FF0080' : i === 3 ? '#00F5D4' : '#fff',
                  textShadow:
                    i === 1 ? '0 0 30px rgba(255,0,128,0.4)' :
                    i === 3 ? '0 0 30px rgba(0,245,212,0.4)' : 'none',
                }}
              >
                {word}
              </span>
            ))}
          </h1>

          {/* Selected medium badge */}
          <AnimatePresence>
            {chosenMedium && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  background: `rgba(0,0,0,0.6)`,
                  border: `1px solid ${chosenMedium.color}44`,
                  boxShadow: `0 0 14px rgba(0,0,0,0.3)`,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: chosenMedium.color }} />
                <span
                  className="text-xs font-space tracking-wider font-bold"
                  style={{ color: chosenMedium.color }}
                >
                  {chosenMedium.label.toUpperCase()}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Conflict badge once chosen */}
          <AnimatePresence>
            {selectedConflict && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <span className="text-[9px] tracking-[0.2em] text-white/40 font-space uppercase">
                  CONFLICT CHOSEN ✓
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right — Orin side panel ────────────────────────────── */}
        <motion.aside
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', damping: 24, stiffness: 180 }}
          className="panel w-[360px] flex-shrink-0 flex flex-col overflow-hidden"
        >
          {/* Panel header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
            <OrinOrb size={36} pulse={false} />
            <div>
              <p className="text-[9px] tracking-[0.22em] text-[#00F5D4]/60 font-space uppercase">
                ORIN · MISSION PARTNER
              </p>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
            <AnimatePresence mode="wait">
              {step === 'brief' ? (
                <motion.div
                  key="brief"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-5"
                >
                  <p className="font-caveat text-xl text-white/80 leading-snug">
                    Hi {MOCK_USER.firstName}, let's start your mission.
                  </p>

                  <div>
                    <p className="section-label">THE MISSION</p>
                    <p className="text-sm text-white/60 font-inter leading-relaxed">
                      {MOCK_MISSION.mission}
                    </p>
                  </div>

                  <div>
                    <p className="section-label">THE BIG QUESTION</p>
                    <p className="text-sm text-white/60 font-inter leading-relaxed italic">
                      {MOCK_MISSION.bigQuestion}
                    </p>
                  </div>

                  <div>
                    <p className="section-label">CHOOSE YOUR MEDIUM</p>
                    <div className="flex flex-col gap-2 mt-1">
                      {MEDIUM_OPTIONS.map((m) => {
                        const isSel = selectedMedium === m.id;
                        return (
                          <motion.button
                            key={m.id}
                            onClick={() => handleMediumSelect(m.id)}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-3 px-3 py-3 rounded-lg border text-left transition-all duration-200"
                            style={{
                              borderColor: isSel ? `${m.color}66` : 'rgba(255,255,255,0.08)',
                              background: isSel ? `${m.color}10` : 'rgba(255,255,255,0.02)',
                              boxShadow: isSel ? `0 0 14px ${m.color}22` : 'none',
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: m.color, boxShadow: `0 0 6px ${m.color}` }}
                            />
                            <span className="text-sm font-space text-white/70">{m.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    className="text-[11px] text-[#00F5D4]/40 font-space tracking-wide hover:text-[#00F5D4]/75 transition-colors text-left"
                    onClick={() => setConflictOpen(true)}
                  >
                    + SKIP TO CORE CONFLICT →
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-5"
                >
                  {chosenMedium && (
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full self-start text-[10px] font-space tracking-wide font-bold"
                      style={{
                        background: `${chosenMedium.color}18`,
                        border: `1px solid ${chosenMedium.color}44`,
                        color: chosenMedium.color,
                      }}
                    >
                      {chosenMedium.label.toUpperCase()}
                    </div>
                  )}

                  <p className="text-sm text-white/70 font-inter leading-relaxed">
                    You've chosen your path, {MOCK_USER.firstName}. The mission is ready.
                  </p>

                  <div
                    className="px-4 py-3 rounded-lg border border-white/8"
                    style={{ background: 'rgba(255,0,128,0.04)' }}
                  >
                    <p className="text-[10px] tracking-[0.2em] text-white/35 font-space uppercase mb-1">
                      YOUR CONFLICT
                    </p>
                    <p className="text-sm font-space text-white/75">
                      {selectedConflict === 'pillars' ? '🏛 Pillars of Order' : '⚡ Power of One'}
                    </p>
                  </div>

                  <p className="text-xs text-white/35 font-inter text-center">
                    Ready to step into the investigation?
                  </p>

                  <motion.button
                    onClick={() => router.push('/landscape')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="relative overflow-hidden rounded-lg font-space font-bold text-xs tracking-[0.14em]"
                    style={{
                      height: 50,
                      background: 'linear-gradient(120deg, #FF0080, #a020f0, #00F5D4)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 0 24px rgba(255,0,128,0.3)',
                    }}
                  >
                    <motion.span
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.15) 50%, transparent 65%)',
                        backgroundSize: '250% 100%',
                      }}
                      animate={{ backgroundPosition: ['250% 0', '-250% 0'] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
                    />
                    <span className="relative z-10">▶ START MISSION</span>
                  </motion.button>

                  <button
                    className="text-[11px] text-white/22 font-inter text-center hover:text-white/45 transition-colors"
                    onClick={() => router.push('/landscape')}
                  >
                    Or enter without choosing →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live Orin chat messages */}
          {orin.messages.length > 0 && (
            <div className="px-4 py-3 flex flex-col gap-2 max-h-40 overflow-y-auto border-t border-white/5">
              {orin.messages.map((m, i) => (
                <p key={i} className={`text-xs font-inter leading-relaxed ${m.role === 'user' ? 'text-white/60 text-right' : 'text-white/45'}`}>
                  {m.content}
                </p>
              ))}
              {orin.loading && <p className="text-xs text-white/25 italic animate-pulse">Orin is thinking...</p>}
            </div>
          )}

          {/* Ask Orin input */}
          <div className="px-4 py-3 border-t border-white/5 flex gap-2">
            <input
              className="input-dark text-xs flex-1"
              placeholder="Ask Orin anything..."
              value={orin.input}
              onChange={(e) => orin.setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && orin.send()}
            />
            <button
              onClick={() => orin.send()}
              disabled={orin.loading}
              className="text-[#00F5D4]/60 hover:text-[#00F5D4] disabled:opacity-30 transition-colors text-sm px-1"
            >→</button>
          </div>
        </motion.aside>
      </div>
    </motion.div>
  );
}
