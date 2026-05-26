'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getPipMission, type PipPlanet, type WorldBriefItem } from '@/lib/pip-guide-data';

// =============================================================================
// Design tokens — matches pip-guide/page.tsx exactly
// =============================================================================

const T = {
  bg:    '#050510',
  s1:    '#09091a',
  s2:    '#0d0d1f',
  s3:    '#111128',
  b1:    '#16162a',
  b2:    '#1f1f38',
  tp:    '#e2e8f0',
  ts:    '#8896a8',
  tm:    '#3d4a60',
  ac:    '#00d4d4',
  acDim: 'rgba(0,212,212,0.10)',
  acBdr: 'rgba(0,212,212,0.25)',
} as const;

// =============================================================================
// Types
// =============================================================================

type DockState = 'cta-brief' | 'lock' | 'understand' | 'mission-qa' | 'launch' | 'done';

type ChatMsg =
  | { id: string; role: 'pip' | 'user'; type: 'text';    html: string }
  | { id: string; role: 'user';          type: 'chip';    icon: string; text: string }
  | { id: string; role: 'pip';           type: 'brief';   items: WorldBriefItem[]; summary: string }
  | { id: string; role: 'pip';           type: 'mission'; chapter: string; title: string; objective: string }
  | { id: string; role: 'pip';           type: 'howto';   planets: PipPlanet[] }
  | { id: string; role: 'pip';           type: 'typing' };

let _idCounter = 0;
function uid() { return `msg_${++_idCounter}_${Date.now()}`; }

export interface PipGuidePanelProps {
  missionOrder: number;
  firstPlanet?: { id: string; label: string };
  onLaunch?: () => void;
}

// =============================================================================
// Pip avatar orb
// =============================================================================

function PipOrb({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'radial-gradient(circle at 35% 35%, #00ffff, #0088aa 60%, #003344)',
      boxShadow: `0 0 ${size * 0.6}px rgba(0,212,212,0.55)`,
      border: `1px solid rgba(0,212,212,0.5)`,
    }} />
  );
}

// =============================================================================
// Typing indicator
// =============================================================================

function TypingBubble() {
  return (
    <div className="flex items-start gap-2 px-4">
      <PipOrb size={24} />
      <div style={{
        background: T.s2, border: `1px solid ${T.b1}`,
        borderRadius: '4px 14px 14px 14px', padding: '10px 14px',
      }}>
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              style={{ width: 6, height: 6, borderRadius: '50%', background: T.ac, display: 'block' }}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// World Brief — colored left-stripe cards, expanded by default
// =============================================================================

const STRIPE_COLORS = ['#9d4edd', '#f4a20e', '#ef4444'];

function WorldBrief({ items, summary }: { items: WorldBriefItem[]; summary: string }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{
      background: T.s2, border: `1px solid ${T.b1}`,
      borderRadius: 14, overflow: 'hidden', width: '100%',
    }}>
      {/* Header — click to toggle */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '11px 14px', cursor: 'pointer',
          borderBottom: open ? `1px solid ${T.b1}` : 'none',
        }}
      >
        <span style={{ fontSize: 14, flexShrink: 0 }}>📡</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 9, fontWeight: 800, color: T.ac,
            textTransform: 'uppercase', letterSpacing: '0.14em', marginRight: 6,
          }}>
            World Brief
          </span>
          <span style={{ fontSize: 11, color: T.tm }}>{summary}</span>
        </div>
        <span style={{
          fontSize: 10, color: T.tm, flexShrink: 0, display: 'inline-block',
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.2s',
        }}>▾</span>
      </div>

      {/* Colored stripe cards */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', borderRadius: 8, overflow: 'hidden',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {/* Colored left stripe */}
                  <div style={{
                    width: 4, flexShrink: 0,
                    background: STRIPE_COLORS[i] ?? STRIPE_COLORS[0],
                  }} />
                  {/* Text content */}
                  <div style={{ padding: '10px 12px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: STRIPE_COLORS[i] ?? STRIPE_COLORS[0],
                      marginBottom: 5,
                    }}>
                      {item.title}
                    </div>
                    <div
                      style={{ fontSize: 12, color: T.ts, lineHeight: 1.62 }}
                      dangerouslySetInnerHTML={{ __html: item.body }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Mission Card
// =============================================================================

function MissionCard({ chapter, title, objective }: { chapter: string; title: string; objective: string }) {
  return (
    <div style={{
      background: T.s2, border: `1px solid ${T.b1}`,
      borderLeft: `4px solid ${T.ac}`,
      borderRadius: '4px 16px 16px 16px', padding: 18, width: '100%',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, color: T.ac,
          background: T.acDim, border: `1px solid ${T.acBdr}`,
          padding: '3px 8px', borderRadius: 20,
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>{chapter}</span>
        <span style={{ fontSize: 9, color: T.tm, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Mission Project</span>
      </div>
      <div style={{ fontSize: 19, fontWeight: 900, color: T.tp, lineHeight: 1.2, marginBottom: 10 }}>
        {title}
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.65, color: T.ts, margin: 0 }}>
        {objective}
      </p>
    </div>
  );
}

// =============================================================================
// How-To Card — CHANGE 5: elaborate text, single planet suggestion
// =============================================================================

function HowToCard({ planets, firstPlanet }: { planets: PipPlanet[]; firstPlanet?: { id: string; label: string } }) {
  const router = useRouter();
  const suggested = planets[0];

  return (
    <div style={{
      background: T.s2, border: `1px solid ${T.b1}`,
      borderRadius: 14, padding: '16px', width: '100%',
    }}>
      <div style={{
        fontSize: 9, fontWeight: 800, color: T.ts,
        textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10,
      }}>
        How to explore
      </div>

      <p style={{ fontSize: 12, color: T.ts, margin: '0 0 10px', lineHeight: 1.6 }}>
        Your mission map is on the left — each planet represents a topic to investigate.{' '}
        <strong style={{ color: T.tp }}>Click any planet on the map</strong> to enter it and start digging in.
        Gather evidence as you go, save key insights with ✦, then return when you&apos;re ready to build your case.
      </p>

      <p style={{ fontSize: 12, color: T.ts, margin: '0 0 10px', lineHeight: 1.5 }}>
        We suggest starting with:
      </p>

      {suggested && (
        <motion.div
          whileHover={{ borderColor: 'rgba(0,245,212,0.35)', x: 2 }}
          onClick={() => firstPlanet && router.push(`/landscape/${firstPlanet.id}`)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: 10,
            cursor: firstPlanet ? 'pointer' : 'default',
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.02)',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>{suggested.icon}</span>
            <span style={{ fontSize: 12, color: T.ts, fontWeight: 600 }}>{suggested.name}</span>
          </div>
          <span style={{ fontSize: 10, color: 'rgba(0,245,212,0.4)', letterSpacing: '0.08em' }}>EXPLORE →</span>
        </motion.div>
      )}
    </div>
  );
}

// =============================================================================
// Message bubble — dispatches to correct renderer per type
// =============================================================================

function MessageBubble({ msg, firstPlanet }: { msg: ChatMsg; firstPlanet?: { id: string; label: string } }) {
  if (msg.type === 'typing') return <TypingBubble />;

  if (msg.role === 'user') {
    if (msg.type === 'chip') {
      return (
        <div className="flex justify-end px-4">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: T.acDim, border: `1.5px solid ${T.acBdr}`,
            borderRadius: '14px 4px 14px 14px', padding: '9px 14px',
          }}>
            <span style={{ fontSize: 14 }}>{msg.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ac }}>{msg.text}</span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex justify-end px-4">
        <div style={{
          background: T.acDim, border: `1.5px solid ${T.acBdr}`,
          borderRadius: '14px 4px 14px 14px', padding: '10px 14px', maxWidth: '85%',
        }}>
          <p style={{ fontSize: 13, color: T.ac, margin: 0 }}>{msg.html}</p>
        </div>
      </div>
    );
  }

  switch (msg.type) {
    case 'text':
      return (
        <div className="flex items-start gap-2 px-4">
          <PipOrb size={24} />
          <div style={{
            background: T.s2, border: `1px solid ${T.b1}`,
            borderRadius: '4px 14px 14px 14px', padding: '12px 14px', maxWidth: '90%',
          }}>
            <p
              style={{ fontSize: 13, lineHeight: 1.68, color: T.ts, margin: 0 }}
              dangerouslySetInnerHTML={{ __html: msg.html }}
            />
          </div>
        </div>
      );
    case 'brief':
      return (
        <div className="flex items-start gap-2 px-4">
          <PipOrb size={24} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <WorldBrief items={msg.items} summary={msg.summary} />
          </div>
        </div>
      );
    case 'mission':
      return (
        <div className="flex items-start gap-2 px-4">
          <PipOrb size={24} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <MissionCard chapter={msg.chapter} title={msg.title} objective={msg.objective} />
          </div>
        </div>
      );
    case 'howto':
      return (
        <div className="flex items-start gap-2 px-4">
          <PipOrb size={24} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <HowToCard planets={msg.planets} firstPlanet={firstPlanet} />
          </div>
        </div>
      );
    default:
      return null;
  }
}

// =============================================================================
// Dock components
// =============================================================================

function CtaBriefDock({ onGenerate }: { onGenerate: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onGenerate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '15px 18px',
        background: hovered ? T.s3 : T.s2,
        border: `1.5px solid ${hovered ? 'rgba(0,212,212,0.4)' : T.b2}`,
        borderRadius: 14, cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: T.acDim, border: `1px solid ${T.acBdr}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: 18 }}>🌐</span>
      </div>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.tp }}>Generate World Brief</div>
        <div style={{ fontSize: 11, color: T.ts, marginTop: 2 }}>Understand the historical context first</div>
      </div>
      <span style={{ color: T.ac, fontSize: 16 }}>→</span>
    </button>
  );
}

function LockDock() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 18px' }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{ width: 6, height: 6, borderRadius: '50%', background: T.ac, display: 'block', opacity: 0.45 }}
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.22 }}
        />
      ))}
    </div>
  );
}

function UnderstandDock({ onGotIt, onSend }: { onGotIt: () => void; onSend: (text: string) => void }) {
  const [val, setVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const send = () => {
    if (!val.trim()) return;
    onSend(val.trim());
    setVal('');
    inputRef.current?.focus();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        background: T.s2, border: `1px solid ${T.b1}`,
        borderRadius: 12, padding: '4px 4px 4px 14px',
      }}>
        <input
          ref={inputRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask me anything about this era…"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 13, color: T.tp,
            // @ts-ignore — caretColor is valid CSS
            caretColor: T.ac,
          }}
        />
        <button
          onClick={send}
          disabled={!val.trim()}
          style={{
            padding: '9px 14px', borderRadius: 8, border: 'none',
            cursor: val.trim() ? 'pointer' : 'default',
            background: val.trim() ? T.ac : T.b2,
            color: val.trim() ? '#000' : T.tm,
            fontSize: 13, fontWeight: 800, transition: 'all 0.15s', flexShrink: 0,
          }}
        >→</button>
      </div>

      <button
        onClick={onGotIt}
        style={{
          width: '100%', padding: '13px 18px', borderRadius: 12,
          background: T.acDim, border: `1.5px solid ${T.acBdr}`,
          color: T.ac, fontSize: 14, fontWeight: 800, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,212,0.15)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.acDim; }}
      >
        Got it — I&apos;m ready to answer →
      </button>
    </div>
  );
}

function MissionQaDock({ onAccept, onSend }: { onAccept: () => void; onSend: (text: string) => void }) {
  const [val, setVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const send = () => {
    if (!val.trim()) return;
    onSend(val.trim());
    setVal('');
    inputRef.current?.focus();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        background: T.s2, border: `1px solid ${T.b1}`,
        borderRadius: 12, padding: '4px 4px 4px 14px',
      }}>
        <input
          ref={inputRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask me anything about this mission…"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 13, color: T.tp,
            // @ts-ignore — caretColor is valid CSS
            caretColor: T.ac,
          }}
        />
        <button
          onClick={send}
          disabled={!val.trim()}
          style={{
            padding: '9px 14px', borderRadius: 8, border: 'none',
            cursor: val.trim() ? 'pointer' : 'default',
            background: val.trim() ? T.ac : T.b2,
            color: val.trim() ? '#000' : T.tm,
            fontSize: 13, fontWeight: 800, transition: 'all 0.15s', flexShrink: 0,
          }}
        >→</button>
      </div>

      <button
        onClick={onAccept}
        style={{
          width: '100%', padding: '13px 18px', borderRadius: 12,
          background: T.acDim, border: `1.5px solid ${T.acBdr}`,
          color: T.ac, fontSize: 14, fontWeight: 800, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,212,0.15)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.acDim; }}
      >
        Got it — Accept Mission →
      </button>
    </div>
  );
}

function LaunchDock({ onLaunch }: { onLaunch: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 14 }}>
      <button
        onClick={onLaunch}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%', padding: '17px', borderRadius: 14, border: 'none',
          background: 'linear-gradient(135deg, #0ea5a5 0%, #9d4edd 100%)',
          color: '#fff', fontSize: 16, fontWeight: 900, cursor: 'pointer',
          letterSpacing: '0.04em', position: 'relative', overflow: 'hidden',
          transform: hovered ? 'translateY(-1px)' : 'none',
          boxShadow: hovered
            ? '0 6px 24px rgba(0,212,212,0.3), 0 6px 24px rgba(157,78,221,0.3)'
            : 'none',
          transition: 'all 0.2s',
        }}
      >
        <motion.div
          style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: '60%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
            pointerEvents: 'none',
          }}
          animate={{ x: ['-100%', '280%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', delay: 0.3 }}
        />
        <span style={{ position: 'relative', zIndex: 1 }}>🚀 Launch Mission</span>
      </button>
    </div>
  );
}

function DoneDock() {
  return (
    <div style={{ textAlign: 'center', padding: '10px 0' }}>
      <span style={{ fontSize: 11, color: T.ts, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        ✦ Mission Active · Explore the planets
      </span>
    </div>
  );
}

// =============================================================================
// PipGuidePanel — sidebar-embedded component (no full-page wrapper or header)
// CHANGE 4: flex-1 + overflow-y-auto for scrollable content area
// =============================================================================

export default function PipGuidePanel({ missionOrder, firstPlanet, onLaunch }: PipGuidePanelProps) {
  const mission = getPipMission(missionOrder);

  const [messages,      setMessages]      = useState<ChatMsg[]>([]);
  const [dock,          setDock]          = useState<DockState>('lock');
  const [qaIdx,         setQaIdx]         = useState(0);
  const [missionQaIdx,  setMissionQaIdx]  = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  // CHANGE 4: auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const push = useCallback((msg: ChatMsg) => {
    setMessages((prev) => [...prev.filter((m) => m.type !== 'typing'), msg]);
  }, []);

  const showTyping = useCallback(() => {
    setMessages((prev) => [
      ...prev.filter((m) => m.type !== 'typing'),
      { id: uid(), role: 'pip', type: 'typing' },
    ]);
  }, []);

  // Opening two messages on mount
  useEffect(() => {
    const t1 = setTimeout(() => showTyping(), 300);
    const t2 = setTimeout(() => {
      push({
        id: uid(), role: 'pip', type: 'text',
        html: mission.openingMessage.replace(/\n/g, '<br/>'),
      });
    }, 1600);
    const t3 = setTimeout(() => showTyping(), 2100);
    const t4 = setTimeout(() => {
      push({ id: uid(), role: 'pip', type: 'text', html: mission.openingMessage2 });
      setDock('cta-brief');
    }, 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleGenerateBrief() {
    setDock('lock');
    push({ id: uid(), role: 'user', type: 'chip', icon: '🌐', text: 'Generate World Brief' });
    setTimeout(showTyping, 400);
    setTimeout(() => {
      push({ id: uid(), role: 'pip', type: 'brief', items: mission.worldBriefItems, summary: mission.worldBriefSummary });
      setTimeout(showTyping, 300);
      setTimeout(() => {
        push({
          id: uid(), role: 'pip', type: 'text',
          html: `Take your time with that. <strong style="color:${T.tp}">Ask me anything</strong> about this era — or click <em style="color:${T.ac}">Got it</em> when you feel ready to weigh in.`,
        });
        setDock('understand');
      }, 1300);
    }, 1700);
  }

  function handleQA(text: string) {
    push({ id: uid(), role: 'user', type: 'text', html: text });
    const ans = mission.qaAnswers[qaIdx % mission.qaAnswers.length];
    setQaIdx((q) => q + 1);
    setTimeout(showTyping, 400);
    setTimeout(() => {
      push({ id: uid(), role: 'pip', type: 'text', html: ans });
    }, 1900);
  }

  function handleGotIt() {
    setDock('lock');
    push({ id: uid(), role: 'user', type: 'chip', icon: '✓', text: 'Got it' });
    setTimeout(showTyping, 400);
    setTimeout(() => {
      push({
        id: uid(), role: 'pip', type: 'mission',
        chapter:   mission.chapter,
        title:     mission.projectTitle,
        objective: mission.projectObjective,
      });
    }, 1400);
    setTimeout(showTyping, 2700);
    setTimeout(() => {
      push({
        id: uid(), role: 'pip', type: 'text',
        html: `That&apos;s your mission. Take a moment to look it over — <strong style="color:${T.tp}">ask me anything</strong> about what&apos;s expected, or accept when you&apos;re ready.`,
      });
      setDock('mission-qa');
    }, 4000);
  }

  function handleMissionQA(text: string) {
    push({ id: uid(), role: 'user', type: 'text', html: text });
    const ans = mission.missionQaAnswers[missionQaIdx % mission.missionQaAnswers.length];
    setMissionQaIdx((q) => q + 1);
    setTimeout(showTyping, 400);
    setTimeout(() => {
      push({ id: uid(), role: 'pip', type: 'text', html: ans });
    }, 1900);
  }

  function handleAcceptMission() {
    setDock('lock');
    push({ id: uid(), role: 'user', type: 'chip', icon: '✓', text: 'Got it — Accept Mission' });
    setTimeout(showTyping, 400);
    setTimeout(() => {
      push({ id: uid(), role: 'pip', type: 'howto', planets: mission.planets });
      setDock('launch');
    }, 1600);
  }

  function handleLaunch() {
    setDock('lock');
    push({ id: uid(), role: 'user', type: 'chip', icon: '🚀', text: 'Launch Mission' });
    setTimeout(showTyping, 400);
    setTimeout(() => {
      push({
        id: uid(), role: 'pip', type: 'text',
        html: `Your mission begins, Traveler. Explore each planet, <strong style="color:${T.tp}">save every insight</strong> you find with ✦, and return when you're ready to build your case.`,
      });
      setDock('done');
      if (onLaunch) setTimeout(onLaunch, 2000);
    }, 1700);
  }

  function renderDock() {
    switch (dock) {
      case 'cta-brief':  return <CtaBriefDock onGenerate={handleGenerateBrief} />;
      case 'lock':       return <LockDock />;
      case 'understand':  return <UnderstandDock onGotIt={handleGotIt} onSend={handleQA} />;
      case 'mission-qa': return <MissionQaDock onAccept={handleAcceptMission} onSend={handleMissionQA} />;
      case 'launch':     return <LaunchDock onLaunch={handleLaunch} />;
      case 'done':       return <DoneDock />;
    }
  }

  return (
    // CHANGE 4: flex column fills the sidebar, content area scrolls
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto min-h-0 panel-chat-scroll py-4 flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <MessageBubble msg={msg} firstPlanet={firstPlanet} />
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* Dock — stays pinned at bottom */}
      <div className="border-t border-white/5 p-3 flex-shrink-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={dock}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {renderDock()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
