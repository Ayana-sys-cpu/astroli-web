'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type PlanetCharacter, type PlanetVoiceMessage } from '@/lib/usePlanetVoice';

// Design tokens — matches PipGuidePanel exactly
const T = {
  s2:    '#000000',
  s3:    '#080808',
  b1:    '#111111',
  b2:    '#161616',
  tp:    '#e2e8f0',
  ts:    '#8896a8',
  tm:    '#3d4a60',
  ac:    '#00d4d4',
  acDim: 'rgba(0,212,212,0.10)',
  acBdr: 'rgba(0,212,212,0.25)',
  fig:   '#a090d4',
  figDim: 'rgba(160,144,212,0.10)',
  figBdr: 'rgba(160,144,212,0.25)',
  orin:  '#06D6A0',
} as const;

interface Props {
  character: PlanetCharacter;
  messages: PlanetVoiceMessage[];
  input: string;
  setInput: (v: string) => void;
  send: () => void;
  sendText: (text: string) => void;
  askOrin: () => void;
  loading: boolean;
  thinking: boolean;
  studentFirstName?: string;
  missionTitle?: string;
  savedIds?: string[];
  onSave?: (id: string) => void;
  openingGreeting?: string;
  studentRevealMessage?: string;
}

function FigureOrb({ size = 24 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'radial-gradient(circle at 35% 35%, #d0c0ff, #7755bb 60%, #2a1a44)',
      border: '1px solid rgba(160,144,212,0.5)',
      animation: 'figOrbPulse 3s ease-in-out infinite',
    }} />
  );
}

function OrinOrb({ size = 24 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'radial-gradient(circle at 35% 35%, #80ffcc, #00aa77 60%, #003322)',
      border: '1px solid rgba(6,214,160,0.5)',
      animation: 'orinOrbPulse 2s ease-in-out infinite',
    }} />
  );
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-2 px-4">
      <FigureOrb size={24} />
      <div style={{
        background: 'rgba(119,85,187,0.10)', border: '1px solid rgba(160,144,212,0.18)',
        borderRadius: '4px 14px 14px 14px', padding: '10px 14px',
      }}>
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              style={{ width: 6, height: 6, borderRadius: '50%', background: T.fig, display: 'block' }}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PlanetVoicePanel({
  character, messages, input, setInput, send, sendText, askOrin, loading, thinking,
  studentFirstName, missionTitle, savedIds = [], onSave, openingGreeting, studentRevealMessage,
}: Props) {
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [orinFlash, setOrinFlash] = useState(false);
  // Greeting starts ready if history already exists (returning user), otherwise animate in
  const [greetingReady, setGreetingReady] = useState(() => messages.length > 0);

  useEffect(() => {
    if (greetingReady || !openingGreeting) return;
    const t = setTimeout(() => setGreetingReady(true), 1500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Also scroll when the typing bubble appears so it's always visible
  useEffect(() => {
    if (loading || thinking) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [loading, thinking]);

  // Flash the input dock border when an Orin message arrives
  const lastOrinId = messages.filter(m => m.speaker === 'orin').at(-1)?.id;
  useEffect(() => {
    if (!lastOrinId) return;
    setOrinFlash(true);
    const t = setTimeout(() => setOrinFlash(false), 1500);
    return () => clearTimeout(t);
  }, [lastOrinId]);

  const figureName = character.name.split(' ')[0].toUpperCase();

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">

      {/* ── Scrollable messages ── */}
      <div className="flex-1 overflow-y-auto min-h-0 py-4 flex flex-col gap-3">

        {/* Typing indicator for opening greeting — shown while greetingReady is false */}
        {openingGreeting && !greetingReady && <TypingBubble />}

        {/* Opening greeting — fades in after the typing animation completes */}
        {openingGreeting && greetingReady && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-start gap-2 px-4"
          >
            <FigureOrb size={24} />
            <div style={{
              background: 'rgba(119,85,187,0.10)', border: '1px solid rgba(160,144,212,0.18)',
              borderRadius: '4px 14px 14px 14px',
              padding: '12px 14px', maxWidth: '90%',
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, color: T.fig,
                textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 5,
              }}>
                {figureName}
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.68, color: T.ts, margin: 0 }}>
                {openingGreeting}
              </p>
            </div>
          </motion.div>
        )}


        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map(msg => {
            // Student
            if (msg.speaker === 'student') {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="flex justify-end px-4"
                >
                  <div style={{
                    background: T.figDim, border: `1.5px solid ${T.figBdr}`,
                    borderRadius: '14px 4px 14px 14px',
                    padding: '10px 14px', maxWidth: '85%',
                  }}>
                    <p style={{ fontSize: 13, color: T.fig, margin: 0, lineHeight: 1.6 }}>
                      {msg.content}
                    </p>
                  </div>
                </motion.div>
              );
            }

            // Orin
            if (msg.speaker === 'orin') {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="flex items-start gap-2 px-4"
                >
                  <OrinOrb size={24} />
                  <div style={{
                    flex: 1, background: 'rgba(0,255,209,0.04)',
                    border: `1px solid rgba(6,214,160,0.2)`,
                    borderLeft: `2px solid ${T.orin}`,
                    borderRadius: '4px 14px 14px 14px',
                    padding: '12px 14px',
                    boxShadow: '0 0 16px rgba(0,255,209,0.04)',
                  }}>
                    <div style={{
                      fontSize: 9, fontWeight: 800, color: T.orin,
                      textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 5,
                    }}>
                      ORIN · GUIDE
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.68, color: T.ts, margin: 0 }}>
                      {msg.content}
                    </p>
                  </div>
                </motion.div>
              );
            }

            // Figure — with save affordance
            const isSaved  = savedIds.includes(msg.id);
            const isHovered = hoveredId === msg.id;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="flex items-start gap-2 px-4"
                onMouseEnter={() => setHoveredId(msg.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <FigureOrb size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    background: isSaved ? 'rgba(6,214,160,0.04)' : 'rgba(119,85,187,0.10)',
                    border: `1px solid ${isSaved ? 'rgba(6,214,160,0.2)' : 'rgba(160,144,212,0.18)'}`,
                    borderRadius: '4px 14px 14px 14px',
                    padding: '12px 14px',
                  }}>
                    <div style={{
                      fontSize: 9, fontWeight: 800, color: T.fig,
                      textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 5,
                    }}>
                      {figureName}
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.68, color: T.ts, margin: 0 }}>
                      {msg.content}
                    </p>
                  </div>
                  <div style={{ height: 18, display: 'flex', alignItems: 'center', marginTop: 2 }}>
                    {isSaved ? (
                      <span style={{
                        fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase',
                        color: T.orin, border: `1px solid rgba(6,214,160,0.3)`,
                        borderRadius: 4, padding: '1px 6px',
                      }}>
                        SAVED
                      </span>
                    ) : isHovered && onSave ? (
                      <button
                        onClick={() => onSave(msg.id)}
                        style={{
                          fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                          color: 'rgba(6,214,160,0.6)', background: 'none', border: 'none',
                          cursor: 'pointer', padding: 0, transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.orin; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(6,214,160,0.6)'; }}
                      >
                        SAVE FOR PROJECT
                      </button>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Thinking indicator — shown while loading OR while character is processing */}
        <AnimatePresence>
          {(loading || thinking) && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <TypingBubble />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* ── Start Uncovering CTA — pinned to bottom, shown only before conversation starts ── */}
      {messages.length === 0 && (() => {
        const name    = studentFirstName ?? 'Explorer';
        const mission = missionTitle ?? 'this mission';
        const firstName = figureName.charAt(0) + figureName.slice(1).toLowerCase();
        const prefill = studentRevealMessage
          ?? `Hello, I'm ${name}. I'm on a mission to uncover "${mission}" and I'd love your help. Tell me a little about yourself and how you connect to it.`;
        return (
          <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
            <button
              onClick={() => sendText(prefill)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                background: 'rgba(119,85,187,0.08)',
                border: '1px solid rgba(160,144,212,0.18)',
                outline: '1.5px solid rgba(160,144,212,0.35)',
                outlineOffset: '-1.5px',
                position: 'relative', overflow: 'hidden',
                animation: 'ctaGlow 3s ease-in-out infinite',
                transition: 'outline-color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.outlineColor = 'rgba(160,144,212,0.65)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.outlineColor = 'rgba(160,144,212,0.35)'; }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'rgba(119,85,187,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: '#a78bfa',
              }}>
                ✦
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#a78bfa', marginBottom: 3 }}>
                  Start Uncovering →
                </div>
                <div style={{ fontSize: 12, color: T.ts }}>
                  Introduce yourself to {firstName} and begin the discovery
                </div>
              </div>
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(160,144,212,0.04) 50%, transparent 100%)',
                animation: 'ctaShimmer 4s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
            </button>
          </div>
        );
      })()}

      {/* ── Ask Orin button — only after at least one exchange ── */}
      {messages.length >= 2 && (
        <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
          <button
            onClick={askOrin}
            disabled={loading}
            style={{
              width: '100%', padding: '9px 14px', borderRadius: 10,
              background: 'rgba(6,214,160,0.07)', border: '1px solid rgba(6,214,160,0.2)',
              color: loading ? 'rgba(6,214,160,0.3)' : 'rgba(6,214,160,0.75)',
              fontSize: 11, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'rgba(6,214,160,0.13)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(6,214,160,0.07)'; }}
          >
            ✦ Ask Orin for a hint
          </button>
        </div>
      )}

      {/* ── Input dock — hidden while CTA is shown, visible once conversation starts ── */}
      {messages.length > 0 && <div style={{ borderTop: `1px solid ${T.b1}`, padding: '12px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          background: T.s2,
          border: `1px solid ${orinFlash ? 'rgba(0,255,209,0.5)' : inputFocused ? 'rgba(155,92,255,0.5)' : T.b1}`,
          boxShadow: orinFlash ? '0 0 16px rgba(0,255,209,0.18)' : inputFocused ? '0 0 16px rgba(155,92,255,0.12)' : 'none',
          borderRadius: 12, padding: '4px 4px 4px 14px',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}>
          <input
            ref={inputRef}
            value={input}
            disabled={loading}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !loading) send(); }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={loading
              ? `${character.name.split(' ')[0]} is thinking…`
              : `Ask me anything about this era.`}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 13, color: T.tp,
              // @ts-ignore
              caretColor: T.ac,
              opacity: loading ? 0.4 : 1,
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              padding: '9px 14px', borderRadius: 8, border: 'none', flexShrink: 0,
              cursor: (!loading && input.trim()) ? 'pointer' : 'default',
              background: (!loading && input.trim()) ? T.ac : T.b2,
              color: (!loading && input.trim()) ? '#000' : T.tm,
              fontSize: 13, fontWeight: 800, transition: 'all 0.15s',
            }}
          >
            →
          </button>
        </div>
      </div>}
    </div>
  );
}
