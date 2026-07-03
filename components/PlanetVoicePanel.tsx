'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type PlanetCharacter, type PlanetVoiceMessage } from '@/hooks/usePlanetVoice';
import { t, type Lang } from '@/lib/i18n';
import GalaxyChip from '@/components/GalaxyChip';
import { parseKeywordChips } from '@/lib/parseKeywordChips';
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';

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
  loading: boolean;
  thinking: boolean;
  studentFirstName?: string;
  missionTitle?: string;
  openingGreeting?: string;
  studentRevealMessage?: string;
  missionLang?: Lang;
  // Goal progress strip
  totalGoals?: number | null;
  goalsDiscovered?: number;
  characterFirstName?: string;
  // Discovery review — always available, reachable any time
  onViewDiscovery?: () => void;
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
  character, messages, input, setInput, send, sendText, loading, thinking,
  studentFirstName, missionTitle, openingGreeting, studentRevealMessage,
  missionLang = 'en',
  totalGoals, goalsDiscovered = 0, characterFirstName,
  onViewDiscovery,
}: Props) {
  const lang  = missionLang;
  const isRtl = lang === 'he';
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextarea(inputRef, input);
  const [inputFocused, setInputFocused] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
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
              <p style={{ fontSize: 13, lineHeight: 1.68, color: T.ts, margin: 0, ...(isRtl && { direction: 'rtl', textAlign: 'right' }) }}>
                {parseKeywordChips(openingGreeting ?? '').map((seg, i) =>
                  seg.type === 'keyword'
                    ? <GalaxyChip key={i} term={seg.value} />
                    : <span key={i}>{seg.value}</span>
                )}
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
                    <p style={{ fontSize: 13, color: T.fig, margin: 0, lineHeight: 1.6, ...(isRtl && { direction: 'rtl', textAlign: 'right' }) }}>
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
                    <p style={{ fontSize: 13, lineHeight: 1.68, color: T.ts, margin: 0, ...(isRtl && { direction: 'rtl', textAlign: 'right' }) }}>
                      {msg.content}
                    </p>
                  </div>
                </motion.div>
              );
            }

            // Figure message (auto-summary replaces manual saving)
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="flex items-start gap-2 px-4"
              >
                <FigureOrb size={24} />
                <div style={{
                  background: 'rgba(119,85,187,0.10)',
                  border: '1px solid rgba(160,144,212,0.18)',
                  borderRadius: '4px 14px 14px 14px',
                  padding: '12px 14px', flex: 1,
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 800, color: T.fig,
                    textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 5,
                  }}>
                    {figureName}
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.68, color: T.ts, margin: 0, ...(isRtl && { direction: 'rtl', textAlign: 'right' }) }}>
                    {parseKeywordChips(msg.content).map((seg, i) =>
                      seg.type === 'keyword'
                        ? <GalaxyChip key={i} term={seg.value} />
                        : <span key={i}>{seg.value}</span>
                    )}
                  </p>
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
        const prefill = studentRevealMessage
          ?? t('prefillIntro', lang).replace('{name}', name).replace('{mission}', mission);
        return (
          <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
            <button
              onClick={() => sendText(prefill)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', borderRadius: 14, textAlign: isRtl ? 'right' : 'left', cursor: 'pointer',
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
                  {t('startUncovering', lang)}
                </div>
                <div style={{ fontSize: 12, color: T.ts }}>
                  {t('introduceYourself', lang)}
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


      {/* ── Goal progress strip — visible whenever totalGoals is known and > 0 ── */}
      {typeof totalGoals === 'number' && totalGoals > 0 && (
        <div style={{ borderTop: '1px solid rgba(0,212,212,0.12)', padding: '6px 13px', background: 'rgba(0,212,212,0.04)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {Array.from({ length: totalGoals }).map((_, i) => (
                <span key={i} style={{
                  width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                  background: i < goalsDiscovered ? '#00C4CC' : 'rgba(255,255,255,0.15)',
                  border: i < goalsDiscovered ? 'none' : '0.5px solid rgba(255,255,255,0.25)',
                }} />
              ))}
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', fontFamily: 'monospace', marginLeft: 4, ...(isRtl && { direction: 'rtl' }) }}>
                {goalsDiscovered >= (totalGoals ?? 0)
                  ? t('goalStripAll', lang)
                  : `${goalsDiscovered} ${t('ofWord', lang)} ${totalGoals} ${t('goalStripLabel', lang)}`}
              </span>
            </div>
            {goalsDiscovered < (totalGoals ?? 0) && (
              <button
                onClick={() => setHintOpen(h => !h)}
                style={{ fontSize: 10, color: 'rgba(0,196,204,0.55)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', textDecoration: 'underline dotted', padding: 0, flexShrink: 0 }}
              >
                {t('goalHintLabel', lang)}
              </button>
            )}
          </div>
          {hintOpen && goalsDiscovered < (totalGoals ?? 0) && (
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', lineHeight: 1.55, fontStyle: 'italic', margin: '5px 0 0', ...(isRtl && { direction: 'rtl', textAlign: 'right' }) }}>
              {characterFirstName
                ? `${t('tryAsking', lang)} ${characterFirstName}: "${t('goalHintPhrase', lang)}"`
                : `${t('tryAskingNoName', lang)}: "${t('goalHintPhrase', lang)}"`}
            </p>
          )}
        </div>
      )}

      {/* ── Discovery review button — always visible ── */}
      {onViewDiscovery && (
        <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
          <button
            onClick={onViewDiscovery}
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 12,
              background: 'rgba(155,92,255,0.10)',
              border: '1.5px solid rgba(155,92,255,0.4)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'rgba(155,92,255,0.18)';
              el.style.borderColor = 'rgba(155,92,255,0.7)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'rgba(155,92,255,0.10)';
              el.style.borderColor = 'rgba(155,92,255,0.4)';
            }}
          >
            <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(200,160,255,0.95)' }}>
                {t('whatIDiscoveredHere', lang)}
              </div>
              <div style={{ fontSize: 11, color: T.ts, marginTop: 2 }}>
                {t('discoveryButtonSubtitle', lang)}
              </div>
            </div>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(155,92,255,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: '#fff', fontWeight: 800,
              flexShrink: 0,
            }}>
              ✦
            </div>
          </button>
        </div>
      )}

      {/* ── Input dock — hidden while CTA is shown, visible once conversation starts ── */}
      {messages.length > 0 && <div style={{ borderTop: `1px solid ${T.b1}`, padding: '12px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: T.s2,
          border: `1px solid ${inputFocused ? 'rgba(155,92,255,0.5)' : T.b1}`,
          boxShadow: inputFocused ? '0 0 16px rgba(155,92,255,0.12)' : 'none',
          borderRadius: 12, padding: '10px 4px 10px 14px',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            disabled={loading}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !loading) { e.preventDefault(); send(); } }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={loading
              ? t('figurePlaceholderThinking', lang).replace('{name}', character.name.split(' ')[0])
              : t('askAnythingShort', lang)}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              resize: 'none', overflowY: 'auto',
              fontSize: 13, lineHeight: 1.4, color: T.tp,
              // @ts-ignore
              caretColor: T.ac,
              opacity: loading ? 0.4 : 1,
              direction: isRtl ? 'rtl' : undefined,
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              padding: '9px 14px', borderRadius: 8, border: 'none', flexShrink: 0,
              cursor: (!loading && input.trim()) ? 'pointer' : 'default',
              background: (!loading && input.trim()) ? T.fig : T.b2,
              color: (!loading && input.trim()) ? '#fff' : T.tm,
              fontSize: 13, fontWeight: 800, transition: 'all 0.15s',
            }}
          >
            {isRtl ? '←' : '→'}
          </button>
        </div>
      </div>}
    </div>
  );
}
