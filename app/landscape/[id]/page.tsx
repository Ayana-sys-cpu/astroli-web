'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import OrinOrb from '@/components/OrinOrb';
import { getPlantMeta } from '@/lib/plant-meta';
import { PLANET_EXPERIENCE, NOTEBOOK_INSIGHTS, type Message } from '@/lib/planet-experience';
import { useOrinChat } from '@/lib/useOrinChat';
import { getFirstName } from '@/lib/student-store';

interface Plant {
  id: string;
  title: string;
  label: string | null;
  content: string;
  openingMessage: string | null;
}

type Tab = 'chat' | 'notebook';

function SavedBadge() {
  return (
    <span className="text-[8px] tracking-widest font-space text-[#06D6A0] border border-[#06D6A0]/30 rounded px-1.5 py-0.5 uppercase">
      SAVED
    </span>
  );
}

function ChatMessage({ msg, onSave }: { msg: Message; onSave: (id: number) => void }) {
  const [hovered, setHovered] = useState(false);
  const isYou = msg.sender === 'you';

  return (
    <div
      className={`flex flex-col gap-1 ${isYou ? 'items-end' : 'items-start'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-end gap-1.5">
        <div
          className={`max-w-[240px] px-3 py-2 rounded-lg text-[12px] font-inter leading-relaxed ${
            isYou
              ? 'bg-[#00C4CC]/12 border border-[#00C4CC]/20 text-white/80 rounded-br-none'
              : 'bg-white/5 border border-white/8 text-white/70 rounded-bl-none'
          }`}
        >
          {msg.text}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-white/20 font-inter">{msg.time}</span>
        {msg.saved && <SavedBadge />}
        {!msg.saved && hovered && !isYou && (
          <button
            onClick={() => onSave(msg.id)}
            className="text-[9px] tracking-wider font-space text-[#06D6A0]/60 hover:text-[#06D6A0] transition-colors"
          >
            SAVE FOR PROJECT
          </button>
        )}
      </div>
    </div>
  );
}

export default function PlanetPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [showReward, setShowReward] = useState(false);
  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAvatarThinking, setIsAvatarThinking] = useState(false);
  const [shownMsgCount, setShownMsgCount] = useState(0);
  const thinkingStartTime = useRef(0);
  const processedMsgCount = useRef(0);
  const isThinkingRef     = useRef(false);
  const firstName = getFirstName() || 'Traveler';
  const orin = useOrinChat('plant_screen', params.id, 'plant');

  // Keep isThinkingRef in sync for use inside async closures.
  useEffect(() => { isThinkingRef.current = isAvatarThinking; }, [isAvatarThinking]);

  // Show messages with natural delay for bot replies; user messages appear immediately.
  useEffect(() => {
    if (orin.messages.length <= processedMsgCount.current) return;
    const newestMsg = orin.messages[orin.messages.length - 1];
    processedMsgCount.current = orin.messages.length;

    if (newestMsg.role === 'user' || !isThinkingRef.current) {
      setShownMsgCount(orin.messages.length);
    } else {
      const elapsed   = Date.now() - thinkingStartTime.current;
      const target    = Math.min(2500, 1200 + newestMsg.content.length * 15);
      const remaining = Math.max(0, target - elapsed);
      setTimeout(() => {
        setShownMsgCount(orin.messages.length);
        setIsAvatarThinking(false);
      }, remaining);
    }
  }, [orin.messages.length]);

  function handleSend() {
    if (!orin.input.trim() || isAvatarThinking) return;
    setIsAvatarThinking(true);
    thinkingStartTime.current = Date.now();
    orin.send();
  }

  useEffect(() => {
    fetch(`/api/student/mission?plantId=${params.id}`)
      .then(r => r.json())
      .then(({ plant }) => { setPlant(plant); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-5 h-5 rounded-full border-2 border-[#00C4CC]/30 border-t-[#00C4CC] animate-spin" />
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 font-space text-sm mb-4">Planet not found</p>
          <button onClick={() => router.push('/landscape')} className="btn-ghost font-space text-xs">
            ← BACK TO LANDSCAPE
          </button>
        </div>
      </div>
    );
  }

  const label = plant.label ?? getPlantMeta(plant.title).label;
  const experience = PLANET_EXPERIENCE[label] ?? null;

  const handleSave = (id: number) => {
    if (!savedIds.includes(id)) {
      setSavedIds((prev) => [...prev, id]);
      setShowReward(true);
      setTimeout(() => setShowReward(false), 2500);
    }
  };

  const allMessages: Message[] = (experience?.messages ?? []).map((m) => ({
    ...m,
    saved: m.saved || savedIds.includes(m.id),
  }));

  const savedCount = NOTEBOOK_INSIGHTS.length + savedIds.length;
  const displayName = (() => { const n = firstName; return n ? n[0].toUpperCase() + n.slice(1, 2) + '.' : 'A.'; })();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen bg-black overflow-hidden flex flex-col"
    >
      <StarField count={60} seed={params.id.length * 7} />

      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/40 backdrop-blur-sm">
        <span className="text-[10px] tracking-[0.2em] text-white/35 font-space uppercase">
          {experience
            ? `PLANET · ${experience.location.toUpperCase()} · ${experience.year}`
            : `PLANET · ${label.toUpperCase()}`}
        </span>
        {experience && (
          <span className="text-[10px] tracking-wide text-[#00C4CC]/60 font-space flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C4CC] inline-block" />
            {experience.figure} is presenting
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/40 font-space">{displayName}</span>
          <div className="w-6 h-6 rounded-full border border-[#00C4CC]/50 flex items-center justify-center bg-[#001820]">
            <span className="text-[9px] text-[#00C4CC] font-space font-bold">
              {firstName[0]?.toUpperCase() ?? 'A'}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-14 overflow-hidden h-screen">
        {/* Left — Figure / content screen */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-10 relative">
          <div
            className="relative w-full max-w-md aspect-video flex flex-col items-center justify-center rounded-lg border border-white/8"
            style={{
              background: 'radial-gradient(ellipse at center, #0a0f14 0%, #000408 70%)',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)',
            }}
          >
            <div
              className="absolute inset-0 rounded-lg pointer-events-none opacity-10"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px)',
              }}
            />
            {experience ? (
              <>
                <p className="text-[9px] tracking-[0.3em] text-white/25 font-space uppercase mb-6">
                  {experience.figure.split(' ')[0].toUpperCase()} · {experience.year}
                </p>
                <div
                  className="w-24 h-24 rounded-full border border-white/15 flex items-center justify-center mb-4"
                  style={{
                    background: 'radial-gradient(circle, #1a1a1a, #060606)',
                    boxShadow: '0 0 30px rgba(0,196,204,0.08)',
                  }}
                >
                  <span className="text-3xl text-white/10 font-space font-bold">
                    {experience.figure.split(' ').map((w) => w[0]).join('')}
                  </span>
                </div>
                <p className="text-[10px] tracking-[0.15em] text-white/30 font-space uppercase">
                  {label.toUpperCase()} · {experience.location.toUpperCase()}
                </p>
              </>
            ) : (
              <p className="text-[10px] tracking-[0.3em] text-white/25 font-space uppercase">
                {label.toUpperCase()}
              </p>
            )}
          </div>

          {/* Greeting or opening message */}
          <div className="w-full max-w-md">
            <div className="px-4 py-3 rounded-lg border border-white/8 bg-white/3">
              <p className="text-sm font-caveat text-white/75 italic leading-snug">
                "{experience?.greeting ?? plant.openingMessage ?? plant.title}"
              </p>
            </div>
            {experience && (
              <p className="text-[10px] text-white/30 font-space mt-1.5 pl-1">
                {experience.figure}
              </p>
            )}
          </div>
        </div>

        {/* Right — Chat / Notebook panel */}
        <aside className="panel w-[320px] flex-shrink-0 flex flex-col overflow-hidden">
          <div className="flex border-b border-white/5">
            {(['chat', 'notebook'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-[10px] tracking-[0.18em] font-space uppercase flex items-center justify-center gap-1.5 transition-colors ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-[#00C4CC]'
                    : 'text-white/30 hover:text-white/55'
                }`}
              >
                {tab === 'notebook' ? (
                  <>
                    NOTEBOOK
                    <span className="text-[9px] bg-[#00C4CC]/20 text-[#00C4CC] px-1.5 py-0.5 rounded">
                      {savedCount}
                    </span>
                  </>
                ) : (
                  'IN-CALL MESSAGES'
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'chat' ? (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="px-4 py-2.5 border-b border-white/5">
                  <p className="text-[10px] tracking-wide text-white/35 font-space">
                    Live conversation · hover any message to{' '}
                    <span className="text-[#06D6A0]/60">Save for project</span>
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                  {/* Orin intro — from DB plant opening_message */}
                  {plant.openingMessage && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] tracking-[0.2em] text-[#00C4CC]/50 font-space uppercase">ORIN · GUIDE</span>
                      <div className="px-3 py-2.5 rounded-lg border border-[#00C4CC]/15" style={{ background: 'rgba(0,196,204,0.04)' }}>
                        <p className="text-xs text-white/60 font-inter leading-relaxed whitespace-pre-line">{plant.openingMessage}</p>
                      </div>
                    </div>
                  )}

                  {allMessages.map((msg) => (
                    <ChatMessage key={msg.id} msg={msg} onSave={handleSave} />
                  ))}

                  {orin.messages.slice(0, shownMsgCount).map((m, i) => (
                    <ChatMessage
                      key={`live-${i}`}
                      msg={{ id: 9000 + i, sender: m.role === 'user' ? 'you' : 'figure', text: m.content, time: 'now', saved: false }}
                      onSave={() => {}}
                    />
                  ))}

                  {isAvatarThinking && (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/8 bg-white/3 w-fit">
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: 'rgba(0,196,204,0.6)' }}
                          animate={{ opacity: [0.25, 1, 0.25] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 border-t border-white/5 flex gap-2">
                  <input
                    className="input-dark text-xs flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    placeholder={isAvatarThinking ? 'thinking...' : 'Send a message'}
                    value={orin.input}
                    disabled={isAvatarThinking}
                    onChange={(e) => orin.setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <button
                    onClick={handleSend}
                    disabled={isAvatarThinking}
                    className="text-[#00C4CC]/60 hover:text-[#00C4CC] disabled:opacity-30 transition-colors text-sm px-1"
                  >→</button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="notebook"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="px-4 py-2.5 border-b border-white/5">
                  <p className="text-[9px] tracking-[0.18em] text-white/30 font-space uppercase">
                    {savedCount} SAVED
                    {experience ? ` · ${experience.location.toUpperCase()} · ${experience.year}` : ''}
                  </p>
                  {experience && (
                    <div className="flex gap-3 mt-2">
                      {['ALL', 'BY ' + experience.figure.split(' ')[0].toUpperCase(), 'YOURS'].map((tab) => (
                        <button
                          key={tab}
                          className="text-[9px] tracking-wide font-space text-white/35 hover:text-white/70 transition-colors first:text-white/70"
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
                  {NOTEBOOK_INSIGHTS.map((insight) => (
                    <div
                      key={insight.id}
                      className="px-3 py-2.5 rounded-md border border-white/7 bg-white/2 group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] tracking-wide font-space text-white/35 uppercase">
                          {insight.source}
                        </span>
                        <span className="text-[9px] text-white/20 font-inter">{insight.time}</span>
                      </div>
                      <p className="text-[12px] text-white/65 font-inter leading-relaxed">{insight.text}</p>
                      {insight.tag && (
                        <span className="mt-1.5 inline-block text-[8px] tracking-widest font-space text-[#00C4CC]/40 border border-[#00C4CC]/20 rounded px-1.5 py-0.5">
                          {insight.tag}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 border-t border-white/5 flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="btn-ghost text-[10px] font-space tracking-wide flex-1"
                  >
                    ← BACK TO CHAT
                  </button>
                  <button className="btn-teal text-[10px] font-space tracking-[0.1em] flex-1">
                    SEND TO CASE →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-center py-3 border-t border-white/5">
            <OrinOrb size={32} pulse={false} />
          </div>
        </aside>
      </div>

      {/* Bottom timeline bar */}
      <div className="absolute bottom-0 left-0 right-[320px] h-11 border-t border-white/6 bg-black/80 backdrop-blur-sm flex items-center justify-between px-5">
        <span className="text-[9px] tracking-[0.18em] text-white/30 font-space uppercase">
          {experience ? `TEMPORAL LINK · ${experience.year} CE` : `PLANET · ${label.toUpperCase()}`}
        </span>
        <div className="flex items-center gap-3">
          <button className="text-white/25 hover:text-white/60 transition-colors text-xs">←</button>
          <button className="text-white/25 hover:text-white/60 transition-colors text-xs">→</button>
        </div>
        <button
          onClick={() => router.push('/landscape')}
          className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] font-space text-white/30 hover:text-white/60 transition-colors uppercase"
        >
          ← BACK TO LANDSCAPE
        </button>
      </div>

      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0, y: -10, x: 10 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg border border-[#06D6A0]/30 bg-[#06D6A0]/08 backdrop-blur-sm"
          >
            <span className="text-[#06D6A0] text-xs">✦</span>
            <span className="text-[10px] tracking-wide font-space text-[#06D6A0]/80 uppercase">
              INSIGHT SAVED
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
