'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import { getPipMission, type PipMission, type PipPlanet } from '@/lib/pip-guide-data';

// =============================================================================
// Design tokens — matches pip-guide-chat-ui.html prototype exactly
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

type DockState = 'cta-brief' | 'lock' | 'understand' | 'launch' | 'done';

type ChatMsg =
  | { id: string; role: 'pip' | 'user'; type: 'text';    html: string }
  | { id: string; role: 'user';          type: 'chip';    icon: string; text: string }
  | { id: string; role: 'pip';           type: 'brief';   content: string }
  | { id: string; role: 'pip';           type: 'mission'; chapter: string; title: string; objective: string }
  | { id: string; role: 'pip';           type: 'howto';   planets: PipPlanet[] }
  | { id: string; role: 'pip';           type: 'typing' };

let _idCounter = 0;
function uid() { return `msg_${++_idCounter}_${Date.now()}`; }

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
// World Brief — expandable/collapsible inline component
// =============================================================================

function WorldBrief({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: T.s2, border: `1px solid ${T.b1}`,
      borderRadius: 14, overflow: 'hidden', width: '100%',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 14px', width: '100%',
          background: 'none', border: 'none', cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.s3; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>🌐</span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: T.ac, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            World Brief
          </div>
          <div style={{ fontSize: 11, color: T.ts, marginTop: 2 }}>Historical context · tap to {open ? 'collapse' : 'expand'}</div>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: T.ts, fontSize: 14, lineHeight: 1 }}
        >▾</motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden', borderTop: `1px solid ${T.b1}` }}
          >
            <div style={{ padding: '14px 16px 16px' }}>
              <p style={{ fontSize: 13, lineHeight: 1.68, color: T.ts, margin: 0 }}>
                {content}
              </p>
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
// How-To Card — lists the knowledge planets with chips
// =============================================================================

function HowToCard({ planets }: { planets: PipPlanet[] }) {
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
      <p style={{ fontSize: 12, color: T.ts, margin: '0 0 12px', lineHeight: 1.55 }}>
        Explore each <strong style={{ color: T.tp }}>Knowledge Planet</strong> to gather evidence.
        Save key insights with ✦ as you go, then deliver your verdict.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {planets.map((p) => (
          <span key={p.name} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: T.s3, border: `1px solid ${T.b2}`,
            borderRadius: 20, padding: '5px 10px',
            fontSize: 12, color: T.ts,
          }}>
            <span>{p.icon}</span>
            <strong style={{ color: T.tp, fontWeight: 700 }}>{p.name}</strong>
            <span style={{ fontSize: 10, opacity: 0.6 }}>— {p.hint}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Message bubble — dispatches to correct renderer per type
// =============================================================================

function MessageBubble({ msg }: { msg: ChatMsg }) {
  if (msg.type === 'typing') return <TypingBubble />;

  // User messages
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

  // Pip messages
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
            <WorldBrief content={msg.content} />
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
            <HowToCard planets={msg.planets} />
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
      {/* Text input row */}
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
            padding: '9px 14px', borderRadius: 8, border: 'none', cursor: val.trim() ? 'pointer' : 'default',
            background: val.trim() ? T.ac : T.b2,
            color: val.trim() ? '#000' : T.tm,
            fontSize: 13, fontWeight: 800, transition: 'all 0.15s', flexShrink: 0,
          }}
        >→</button>
      </div>

      {/* Got it button */}
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
          boxShadow: hovered ? '0 6px 24px rgba(0,212,212,0.3), 0 6px 24px rgba(157,78,221,0.3)' : 'none',
          transition: 'all 0.2s',
        }}
      >
        {/* Shine animation */}
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
// Main Chat Component
// =============================================================================

function PipGuideChatInner() {
  const router  = useRouter();
  const params  = useSearchParams();
  const mOrder  = parseInt(params.get('m') ?? '1', 10);
  const mission = getPipMission(mOrder);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [dock,     setDock]     = useState<DockState>('lock');
  const [qaIdx,    setQaIdx]    = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Smooth scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Add to message list, removing any typing indicator first
  const push = useCallback((msg: ChatMsg) => {
    setMessages((prev) => [...prev.filter((m) => m.type !== 'typing'), msg]);
  }, []);

  const showTyping = useCallback(() => {
    setMessages((prev) => [
      ...prev.filter((m) => m.type !== 'typing'),
      { id: uid(), role: 'pip', type: 'typing' },
    ]);
  }, []);

  // ── Init: show Pip's opening message on mount ────────────────────────────────
  // Cleanup ensures strict-mode double-fire clears the first set of timers
  // before the second fires — so we always get exactly one message.
  useEffect(() => {
    const t1 = setTimeout(() => showTyping(), 300);
    const t2 = setTimeout(() => {
      push({
        id: uid(), role: 'pip', type: 'text',
        html: mission.openingMessage.replace(/\n/g, '<br/>'),
      });
      setDock('cta-brief');
    }, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Flow: Generate World Brief ───────────────────────────────────────────────
  function handleGenerateBrief() {
    setDock('lock');
    push({ id: uid(), role: 'user', type: 'chip', icon: '🌐', text: 'Generate World Brief' });
    setTimeout(showTyping, 400);
    setTimeout(() => {
      push({ id: uid(), role: 'pip', type: 'brief', content: mission.worldBrief });
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

  // ── Flow: Q&A during Understand phase ───────────────────────────────────────
  function handleQA(text: string) {
    push({ id: uid(), role: 'user', type: 'text', html: text });
    const ans = mission.qaAnswers[qaIdx % mission.qaAnswers.length];
    setQaIdx((q) => q + 1);
    setTimeout(showTyping, 400);
    setTimeout(() => {
      push({ id: uid(), role: 'pip', type: 'text', html: ans });
    }, 1900);
  }

  // ── Flow: Got It ─────────────────────────────────────────────────────────────
  function handleGotIt() {
    setDock('lock');
    push({ id: uid(), role: 'user', type: 'chip', icon: '✓', text: 'Got it' });
    setTimeout(showTyping, 400);
    // Mission card
    setTimeout(() => {
      push({
        id: uid(), role: 'pip', type: 'mission',
        chapter: mission.chapter,
        title:   mission.projectTitle,
        objective: mission.projectObjective,
      });
    }, 1400);
    // How-To card
    setTimeout(showTyping, 2500);
    setTimeout(() => {
      push({ id: uid(), role: 'pip', type: 'howto', planets: mission.planets });
      setDock('launch');
    }, 3900);
  }

  // ── Flow: Launch Mission ─────────────────────────────────────────────────────
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
      // Navigate to the landscape map
      setTimeout(() => router.push('/landscape'), 3500);
    }, 1700);
  }

  // ── Dock renderer ────────────────────────────────────────────────────────────
  function renderDock() {
    switch (dock) {
      case 'cta-brief':  return <CtaBriefDock onGenerate={handleGenerateBrief} />;
      case 'lock':       return <LockDock />;
      case 'understand': return <UnderstandDock onGotIt={handleGotIt} onSend={handleQA} />;
      case 'launch':     return <LaunchDock onLaunch={handleLaunch} />;
      case 'done':       return <DoneDock />;
    }
  }

  // ── Mission selector tabs (top-right) ────────────────────────────────────────
  function MissionTabs() {
    return (
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            onClick={() => {
              // Reset and navigate to the same page with different mission
              _idCounter = 0;
              router.push(`/pip-guide?m=${n}`);
            }}
            style={{
              padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 10,
              background: mOrder === n ? T.acDim : 'transparent',
              color: mOrder === n ? T.ac : T.tm,
              border: `1px solid ${mOrder === n ? T.acBdr : 'transparent'}`,
              fontWeight: mOrder === n ? 800 : 400,
            }}
          >
            M{n}
          </button>
        ))}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      maxWidth: 680,
      margin: '0 auto',
      // Subtle border on wide screens
      boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.04), inset 1px 0 0 rgba(255,255,255,0.04)',
    }}>
      {/* Star background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <StarField count={60} seed={42} />
      </div>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: `${T.s1}ee`, backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${T.b1}`,
      }}>
        {/* Top row: Pip name + chapter + mission tabs */}
        <div style={{
          padding: '10px 16px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.tp, letterSpacing: '-0.01em' }}>
              Pip · Guide
            </div>
            <div style={{ fontSize: 10, color: T.ts, marginTop: 1 }}>{mission.chapter}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MissionTabs />
            <span style={{
              fontSize: 10, fontWeight: 700, color: T.ac,
              background: T.acDim, border: `1px solid ${T.acBdr}`,
              borderRadius: 20, padding: '3px 10px', letterSpacing: '0.08em',
            }}>
              M{String(mission.order).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Mission brief bar */}
        <div style={{
          margin: '0 16px 10px',
          padding: '7px 12px',
          background: T.s2, border: `1px solid ${T.b1}`, borderRadius: 8,
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span style={{ fontSize: 13, flexShrink: 0 }}>🎯</span>
          <span style={{ fontSize: 11, color: T.ts, fontWeight: 500, lineHeight: 1.4 }}>
            {mission.missionBrief}
          </span>
        </div>
      </div>

      {/* ── Chat area ───────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        paddingTop: 20, paddingBottom: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
        position: 'relative', zIndex: 1,
      }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{ width: '100%' }}
            >
              <MessageBubble msg={msg} />
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* ── Input dock ──────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 20,
        background: `${T.s1}f0`, backdropFilter: 'blur(14px)',
        borderTop: `1px solid ${T.b1}`,
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}>
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

// =============================================================================
// Page export — wraps in Suspense (required for useSearchParams in Next.js 13+)
// =============================================================================

export default function PipGuidePage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#050510', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#00d4d4', fontSize: 12, letterSpacing: '0.2em', opacity: 0.6 }}>LOADING…</div>
      </div>
    }>
      <PipGuideChatInner />
    </Suspense>
  );
}
