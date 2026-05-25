'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
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
  openingMessage:       string | null;
  questionDescription:  string | null;
  projectTitle:         string | null;
  projectDescription:   string | null;
  plants: Plant[];
}

type ChatMsg = { role: 'bot' | 'student'; content: string };

export default function LandscapePage() {
  const router = useRouter();
  const [orinOpen, setOrinOpen]       = useState(true);
  const [firstName, setFirstName]     = useState('');
  const [botName, setBotName]         = useState('');
  const [mission, setMission]         = useState<Mission | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [ready, setReady]             = useState(false);

  // Briefing flow state
  const [chatHistory, setChatHistory]   = useState<ChatMsg[]>([]);
  const [briefingStep, setBriefingStep] = useState(0); // 0=idle 1-3=briefing 4=complete
  const [chatInput, setChatInput]       = useState('');
  const [showStartCard, setShowStartCard] = useState(false);
  const [isAvatarThinking, setIsAvatarThinking] = useState(false);
  const isFirstVisit       = useRef(false);
  const chatBottomRef      = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottom       = useRef(true);
  const mergedOrinCount    = useRef(0);
  const thinkingStartTime  = useRef(0);

  // useOrinChat without contentId — skips the external opening-message fetch.
  // Used only for post-briefing live Claude conversations.
  const orin   = useOrinChat('mission_hub');
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
              if (!missionStatus) {
                isFirstVisit.current = true;
                setShowOverlay(true);
              } else {
                setReady(true);
              }
              setMission(mission);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [router]);

  // Initialise the briefing conversation once mission data arrives.
  useEffect(() => {
    if (!mission || briefingStep !== 0) return;

    if (isFirstVisit.current) {
      // First visit: start the 3-step briefing flow.
      setChatHistory([{
        role: 'bot',
        content: mission.openingMessage ?? `Traveler. You've just entered Mission ${mission.order}. ${mission.question}`,
      }]);
      setBriefingStep(1);
    } else {
      // Returning student: skip straight to the explore view.
      setChatHistory([{ role: 'bot', content: `Back again — which planet do you want to dig into?` }]);
      setBriefingStep(4);
      setShowStartCard(true);
    }
  }, [mission?.id]);

  // Scripted briefing responses derived from mission content.
  const briefingResponses = useMemo((): string[] => {
    if (!mission) return [];

    const projectIntro = mission.projectDescription?.split('\n\n')[0] ?? '';

    return [
      // Step 1 → 2: student responded to opening — give them the "why this matters" context.
      `Here's the world you're scanning into.\n\n${mission.questionDescription ?? ''}`,

      // Step 2 → 3: student responded to context — introduce the project.
      `Your mission project is called "${mission.projectTitle ?? 'this mission'}."\n\n${projectIntro}\n\nYou'll get the full project brief when you're ready to build your argument.`,

      // Step 3 → 4: student responded to project — unlock the map.
      `Look at that — you've got the hard part.\n\nYou understand what this mission is really asking. Now let's start exploring.`,
    ];
  }, [mission?.id]);

  // Merge post-briefing Claude responses into chatHistory with natural delay.
  useEffect(() => {
    if (orin.messages.length <= mergedOrinCount.current) return;
    const newMsgs = orin.messages.slice(mergedOrinCount.current);
    mergedOrinCount.current = orin.messages.length;
    const botMsgs = newMsgs.filter(m => m.role === 'assistant');
    if (botMsgs.length === 0) return;

    const lastContent = botMsgs[botMsgs.length - 1].content;
    const elapsed     = Date.now() - thinkingStartTime.current;
    const target      = Math.min(2500, 1200 + lastContent.length * 15);
    const remaining   = Math.max(0, target - elapsed);

    setTimeout(() => {
      setChatHistory(prev => [
        ...prev,
        ...botMsgs.map(m => ({ role: 'bot' as const, content: m.content })),
      ]);
      setIsAvatarThinking(false);
    }, remaining);
  }, [orin.messages.length]);

  // Auto-scroll only when the user is already at the bottom.
  useEffect(() => {
    if (isNearBottom.current) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory.length, isAvatarThinking]);

  function handleChatScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function handleSend() {
    const msg = chatInput.trim();
    if (!msg || isAvatarThinking) return;
    setChatInput('');

    if (briefingStep >= 1 && briefingStep <= 3) {
      // Briefing mode: append user message immediately, then delay the scripted reply.
      const response = briefingResponses[briefingStep - 1];
      const nextStep = briefingStep + 1;
      setChatHistory(prev => [...prev, { role: 'student', content: msg }]);
      setIsAvatarThinking(true);
      const target = Math.min(2500, 1200 + response.length * 15);
      setTimeout(() => {
        setChatHistory(prev => [...prev, { role: 'bot', content: response }]);
        setBriefingStep(nextStep);
        if (nextStep === 4) setShowStartCard(true);
        setIsAvatarThinking(false);
      }, target);
    } else if (briefingStep >= 4) {
      // Post-briefing: live Claude. Delay applied in the merge useEffect above.
      setChatHistory(prev => [...prev, { role: 'student', content: msg }]);
      setIsAvatarThinking(true);
      thinkingStartTime.current = Date.now();
      orin.send(msg);
    }
  }

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

  // Suggest the first planet as the starting point.
  const suggested = planets[0] ?? null;

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
      <div className="flex flex-1 pt-14 min-h-0 overflow-hidden">

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
              className="panel w-[290px] flex-shrink-0 flex flex-col overflow-hidden min-h-0"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  {avatar.url
                    ? <motion.img
                        src={avatar.url}
                        alt={botName}
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        animate={isAvatarThinking ? {
                          boxShadow: [
                            '0 0 6px rgba(0,245,212,0.3)',
                            '0 0 18px rgba(0,245,212,0.7)',
                            '0 0 6px rgba(0,245,212,0.3)',
                          ],
                        } : { boxShadow: '0 0 8px rgba(0,245,212,0.3)' }}
                        transition={isAvatarThinking
                          ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
                          : { duration: 0.3 }}
                        style={{ border: '1px solid rgba(0,245,212,0.4)' }}
                      />
                    : <OrinOrb size={28} pulse={isAvatarThinking} />}
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

              {/* Chat area */}
              <div
                ref={scrollContainerRef}
                onScroll={handleChatScroll}
                className="panel-chat-scroll flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
              >
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex gap-2.5 ${msg.role === 'student' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'bot' && (
                      <div
                        className="w-0.5 flex-shrink-0 rounded-full mt-0.5"
                        style={{ background: 'rgba(0,245,212,0.2)' }}
                      />
                    )}
                    <p className={`text-xs font-inter leading-relaxed whitespace-pre-line ${
                      msg.role === 'student' ? 'text-white/70 text-right' : 'text-white/50'
                    }`}>
                      {msg.content}
                    </p>
                  </div>
                ))}

                {isAvatarThinking && (
                  <div className="flex gap-2.5 items-center">
                    <div
                      className="w-0.5 self-stretch flex-shrink-0 rounded-full"
                      style={{ background: 'rgba(0,245,212,0.2)' }}
                    />
                    <div className="flex items-center gap-1 py-1">
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: 'rgba(0,245,212,0.5)' }}
                          animate={{ opacity: [0.25, 1, 0.25] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* START HERE card — only appears after briefing is complete and bot is not thinking */}
                {showStartCard && suggested && !isAvatarThinking && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mt-1"
                  >
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
                  </motion.div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-white/5 flex gap-2">
                <input
                  className="input-dark text-xs flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  placeholder={isAvatarThinking ? 'thinking...' : briefingStep >= 4 ? `Ask ${botName}...` : 'Reply...'}
                  value={chatInput}
                  disabled={isAvatarThinking}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button
                  onClick={handleSend}
                  disabled={isAvatarThinking}
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
