'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import OrinOrb from '@/components/OrinOrb';
import { getPlanetMeta } from '@/lib/planet-meta';
import { PLANET_EXPERIENCE, NOTEBOOK_INSIGHTS, type Message } from '@/lib/planet-experience';
import { useOrinChat } from '@/lib/useOrinChat';
import { getFirstName } from '@/lib/student-store';
import { usePlanetVoice, type PlanetVoiceMessage } from '@/lib/usePlanetVoice';
import PlanetVoicePanel from '@/components/PlanetVoicePanel';

interface Planet {
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
      <div
        className={`max-w-[300px] px-3 py-2 rounded-lg text-[12px] font-inter leading-relaxed ${
          isYou
            ? 'bg-[#00C4CC]/12 border border-[#00C4CC]/20 text-white/80 rounded-br-none'
            : 'bg-white/5 border border-white/8 text-white/70 rounded-bl-none'
        }`}
      >
        {msg.text}
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
  const [savedVoiceMsgs, setSavedVoiceMsgs] = useState<PlanetVoiceMessage[]>([]);
  const [showReward, setShowReward] = useState(false);
  const [planet, setPlanet] = useState<Planet | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAvatarThinking, setIsAvatarThinking] = useState(false);
  const [shownMsgCount, setShownMsgCount] = useState(0);
  const thinkingStartTime = useRef(0);
  const processedMsgCount = useRef(0);
  const isThinkingRef = useRef(false);
  const firstName = getFirstName() || 'Traveler';
  const orin = useOrinChat('planet_screen', params.id, 'planet');
  const planetVoice = usePlanetVoice(params.id);

  useEffect(() => { isThinkingRef.current = isAvatarThinking; }, [isAvatarThinking]);

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
    fetch(`/api/student/mission?planetId=${params.id}`)
      .then(r => r.json())
      .then(({ planet }) => { setPlanet(planet); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-5 h-5 rounded-full border-2 border-[#00C4CC]/30 border-t-[#00C4CC] animate-spin" />
      </div>
    );
  }

  if (!planet) {
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

  const label = planet.label ?? getPlanetMeta(planet.title).label;
  const experience = PLANET_EXPERIENCE[label] ?? null;
  const character = planetVoice.character;

  const figureDisplayName = character?.name ?? experience?.figure ?? null;
  const figureLocation    = character?.location ?? experience?.location ?? null;
  const figureEra         = character?.era
    ?? (experience?.year && figureLocation
          ? `${figureLocation} · ${experience.year} CE`
          : experience?.year ? `${experience.year} CE` : null);

  const handleSave = (id: number) => {
    if (!savedIds.includes(id)) {
      setSavedIds(prev => [...prev, id]);
      setShowReward(true);
      setTimeout(() => setShowReward(false), 2500);
    }
  };

  const handleSaveVoiceMsg = (id: string) => {
    const msg = planetVoice.messages.find(m => m.id === id);
    if (msg && !savedVoiceMsgs.find(m => m.id === id)) {
      setSavedVoiceMsgs(prev => [...prev, msg]);
      setShowReward(true);
      setTimeout(() => setShowReward(false), 2500);
    }
  };

  const allMessages: Message[] = (experience?.messages ?? []).map(m => ({
    ...m,
    saved: m.saved || savedIds.includes(m.id),
  }));

  const savedCount = NOTEBOOK_INSIGHTS.length + savedIds.length + savedVoiceMsgs.length;
  const displayName = (() => { const n = firstName; return n ? n[0].toUpperCase() + n.slice(1, 2) + '.' : 'A.'; })();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative h-screen bg-black overflow-hidden flex flex-col"
    >
      <StarField count={60} seed={params.id.length * 7} />

      {/* Top bar */}
      <header className="relative z-20 flex-shrink-0 flex items-center justify-between px-5 h-11 border-b border-white/5 bg-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/landscape')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/20 bg-white/8 hover:bg-white/14 hover:border-white/35 text-white/85 hover:text-white transition-all text-[11px] font-space tracking-[0.12em] font-semibold uppercase"
          >
            ← MAP
          </button>
          {figureEra && (
            <span className="text-[10px] tracking-[0.15em] text-white/35 font-space">
              {figureEra}
            </span>
          )}
        </div>
        {figureDisplayName && (
          <span className="text-[10px] tracking-wide text-[#00C4CC]/60 font-space flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C4CC] inline-block" />
            {figureDisplayName} is presenting
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

      {/* Main content row */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Left — Cinematic figure panel ── */}
        <div className="flex-1 relative overflow-hidden bg-black">

          {/* SPEAKING WITH badge — top left overlay */}
          {figureDisplayName && (
            <div className="absolute top-4 left-5 z-40 flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-white/12 bg-black/50 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00C4CC] opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00C4CC]" />
              </span>
              <span className="text-[9px] tracking-[0.18em] text-white/50 font-space uppercase">SPEAKING WITH</span>
            </div>
          )}

          {/* Scanline texture */}
          <div
            className="absolute inset-0 z-10 pointer-events-none opacity-[0.04]"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,1) 0px, rgba(255,255,255,1) 1px, transparent 1px, transparent 3px)' }}
          />

          {/* Figure — fills the full panel */}
          {character?.listening_video_url ? (
            <video
              src={planetVoice.thinking && character.thinking_video_url
                ? character.thinking_video_url
                : character.listening_video_url}
              className="absolute inset-0 w-full h-full object-cover object-top"
              autoPlay loop muted playsInline
            />
          ) : character?.portrait_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.portrait_url}
              alt={character.name}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          ) : figureDisplayName ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[140px] text-white/[0.025] font-space font-bold select-none leading-none">
                {figureDisplayName.split(' ').map((w: string) => w[0]).join('')}
              </span>
            </div>
          ) : null}

          {/* Cinematic gradients */}
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.3) 100%)' }}
          />
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{ background: 'linear-gradient(to right, transparent 65%, rgba(0,0,0,0.55) 100%)' }}
          />

          {/* Character name — bottom overlay (above the nav bar) */}
          {figureDisplayName && (
            <div className="absolute bottom-11 left-0 right-0 z-30 px-7 pb-5">
              {figureEra && (
                <p className="text-[9px] tracking-[0.3em] text-white/35 font-space uppercase mb-1.5">
                  {figureEra}
                </p>
              )}
              <p
                className="text-2xl font-space font-extrabold tracking-wide leading-tight text-white"
                style={{ animation: 'nameGlow 4s ease-in-out infinite alternate' }}
              >
                {figureDisplayName}
              </p>
            </div>
          )}

          {/* Bottom nav bar — inside left panel */}
          <div className="absolute bottom-0 left-0 right-0 z-40 h-11 border-t border-white/6 bg-black/75 backdrop-blur-sm flex items-center justify-between px-5">
            <span className="text-[9px] tracking-[0.18em] text-white/30 font-space uppercase">
              {figureEra ? `TEMPORAL LINK · ${figureEra}` : `PLANET · ${label.toUpperCase()}`}
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
        </div>

        {/* ── Right — Chat + Notebook panel ── */}
        <aside className="panel w-[380px] flex-shrink-0 flex flex-col overflow-hidden">

          {/* Mission context — always pinned */}
          <div className="px-4 py-3 border-b border-white/5 flex-shrink-0 border-l-2 border-l-[#9b8fd4]/40" style={{ borderLeft: '2px solid rgba(155,143,212,0.35)' }}>
            <p className="text-[9px] tracking-[0.18em] text-[#9b8fd4]/50 font-space uppercase mb-1.5">YOUR MISSION</p>
            <p className="text-[15px] font-semibold text-white/80 font-inter leading-snug mb-2">{planet.title}</p>
            <button
              onClick={() => router.push('/landscape')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#9b8fd4]/30 bg-[#9b8fd4]/8 text-[#9b8fd4]/70 hover:text-[#9b8fd4] hover:border-[#9b8fd4]/50 hover:bg-[#9b8fd4]/14 transition-all text-[9px] tracking-[0.12em] font-space uppercase"
            >
              PROJECT →
            </button>
          </div>

          {/* Tab bar — always shown */}
          <div className="flex border-b border-white/5 flex-shrink-0">
            {(['chat', 'notebook'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-[10px] tracking-[0.18em] font-space uppercase flex items-center justify-center gap-1.5 transition-colors ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-[#00C4CC]'
                    : 'text-white/30 hover:text-white/55'
                }`}
              >
                {tab === 'notebook' ? (
                  <>
                    📓 MY NOTES
                    {savedCount > 0 && (
                      <span className="text-[9px] bg-[#00C4CC]/20 text-[#00C4CC] px-1.5 py-0.5 rounded">
                        {savedCount}
                      </span>
                    )}
                  </>
                ) : '💬 CHAT'}
              </button>
            ))}
          </div>

          {/* Tab content — scroll lives only here */}
          <AnimatePresence mode="wait">
            {activeTab === 'chat' ? (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-hidden flex flex-col min-h-0"
              >
                {character ? (
                  <PlanetVoicePanel
                    character={character}
                    messages={planetVoice.messages}
                    input={planetVoice.input}
                    setInput={planetVoice.setInput}
                    send={planetVoice.send}
                    sendText={planetVoice.sendText}
                    askOrin={planetVoice.askOrin}
                    loading={planetVoice.loading}
                    thinking={planetVoice.thinking}
                    studentFirstName={firstName}
                    missionTitle={planet.title}
                    savedIds={savedVoiceMsgs.map(m => m.id)}
                    onSave={handleSaveVoiceMsg}
                    openingGreeting={experience?.greeting ?? planet.openingMessage ?? undefined}
                  />
                ) : planetVoice.charLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="w-4 h-4 rounded-full border-2 border-[#00C4CC]/30 border-t-[#00C4CC] animate-spin" />
                  </div>
                ) : (
                  // Legacy Orin chat fallback
                  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="px-4 py-2.5 border-b border-white/5 flex-shrink-0">
                      <p className="text-[10px] tracking-wide text-white/35 font-space">
                        Live conversation · hover any message to{' '}
                        <span className="text-[#06D6A0]/60">Save for project</span>
                      </p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 min-h-0">
                      {planet.openingMessage && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] tracking-[0.2em] text-[#00C4CC]/50 font-space uppercase">ORIN · GUIDE</span>
                          <div className="px-3 py-2.5 rounded-lg border border-[#00C4CC]/15" style={{ background: 'rgba(0,196,204,0.04)' }}>
                            <p className="text-xs text-white/60 font-inter leading-relaxed whitespace-pre-line">{planet.openingMessage}</p>
                          </div>
                        </div>
                      )}
                      {allMessages.map(msg => (
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
                    <div className="px-4 py-3 border-t border-white/5 flex gap-2 flex-shrink-0">
                      <input
                        className="input-dark text-xs flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        placeholder={isAvatarThinking ? 'thinking...' : 'Send a message'}
                        value={orin.input}
                        disabled={isAvatarThinking}
                        onChange={e => orin.setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                      />
                      <button
                        onClick={handleSend}
                        disabled={isAvatarThinking}
                        className="text-[#00C4CC]/60 hover:text-[#00C4CC] disabled:opacity-30 transition-colors text-sm px-1"
                      >→</button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="notebook"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-hidden flex flex-col min-h-0"
              >
                <div className="px-4 py-2.5 border-b border-white/5 flex-shrink-0">
                  <p className="text-[9px] tracking-[0.18em] text-white/30 font-space uppercase">
                    {savedCount} SAVED
                    {figureLocation ? ` · ${figureLocation.toUpperCase()}` : ''}
                    {figureEra ? ` · ${figureEra}` : ''}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5 min-h-0">
                  {savedVoiceMsgs.map(msg => (
                    <div key={msg.id} className="px-3 py-2.5 rounded-md border border-[#9b8fd4]/15 bg-[#9b8fd4]/3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] tracking-wide font-space text-[#9b8fd4]/50 uppercase">
                          {character?.name.split(' ')[0] ?? 'FIGURE'} · INSIGHT
                        </span>
                      </div>
                      <p className="text-[12px] text-white/65 font-inter leading-relaxed">{msg.content}</p>
                    </div>
                  ))}
                  {NOTEBOOK_INSIGHTS.map(insight => (
                    <div key={insight.id} className="px-3 py-2.5 rounded-md border border-white/7 bg-white/2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] tracking-wide font-space text-white/35 uppercase">{insight.source}</span>
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
                  {savedCount === 0 && (
                    <p className="text-[11px] text-white/20 font-space text-center mt-10 leading-relaxed">
                      No insights saved yet.<br />Hover any figure message to save.
                    </p>
                  )}
                </div>
                <div className="px-4 py-3 border-t border-white/5 flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setActiveTab('chat')} className="btn-ghost text-[10px] font-space tracking-wide flex-1">
                    ← BACK TO CHAT
                  </button>
                  <button className="btn-teal text-[10px] font-space tracking-[0.1em] flex-1">
                    SEND TO CASE →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-center py-2.5 border-t border-white/5 flex-shrink-0">
            <OrinOrb size={28} pulse={false} />
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0, y: -10, x: 10 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-14 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg border border-[#06D6A0]/30 bg-[#06D6A0]/08 backdrop-blur-sm"
          >
            <span className="text-[#06D6A0] text-xs">✦</span>
            <span className="text-[10px] tracking-wide font-space text-[#06D6A0]/80 uppercase">INSIGHT SAVED</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
