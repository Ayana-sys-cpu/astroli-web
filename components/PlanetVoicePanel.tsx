'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type PlanetCharacter, type PlanetVoiceMessage } from '@/hooks/usePlanetVoice';
import { t, type Lang } from '@/lib/i18n';
import GalaxyChip from '@/components/GalaxyChip';
import { parseKeywordChips } from '@/lib/parseKeywordChips';
import { CharacterMessageBubble } from '@/components/chat/CharacterMessageBubble';
import { ChatTypingIndicator } from '@/components/chat/ChatTypingIndicator';
import { StudentMessageBubble } from '@/components/chat/StudentMessageBubble';
import { ChatInputDock } from '@/components/chat/ChatInputDock';
import { PLANET_FIGURE_SPEAKER, PLANET_ORIN_SPEAKER, PLANET_STUDENT, PLANET_INPUT } from '@/components/chat/chat-themes';

// Panel-surface tokens; chat bubble/input colors live in components/chat/chat-themes.ts
const T = {
  b1: '#111111',
  ts: '#8896a8',
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
        {openingGreeting && !greetingReady && <ChatTypingIndicator speaker={PLANET_FIGURE_SPEAKER} />}

        {/* Opening greeting — fades in after the typing animation completes */}
        {openingGreeting && greetingReady && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <CharacterMessageBubble speaker={PLANET_FIGURE_SPEAKER} label={figureName} maxWidth="90%" isRtl={isRtl}>
              {parseKeywordChips(openingGreeting ?? '').map((seg, i) =>
                seg.type === 'keyword'
                  ? <GalaxyChip key={i} term={seg.value} />
                  : <span key={i}>{seg.value}</span>
              )}
            </CharacterMessageBubble>
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
                >
                  <StudentMessageBubble theme={PLANET_STUDENT} isRtl={isRtl}>
                    {msg.content}
                  </StudentMessageBubble>
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
                >
                  <CharacterMessageBubble speaker={PLANET_ORIN_SPEAKER} label={`ORIN · ${t('guideLabel', lang)}`} fill isRtl={isRtl}>
                    {msg.content}
                  </CharacterMessageBubble>
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
              >
                <CharacterMessageBubble speaker={PLANET_FIGURE_SPEAKER} label={figureName} fill isRtl={isRtl}>
                  {parseKeywordChips(msg.content).map((seg, i) =>
                    seg.type === 'keyword'
                      ? <GalaxyChip key={i} term={seg.value} />
                      : <span key={i}>{seg.value}</span>
                  )}
                </CharacterMessageBubble>
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
              <ChatTypingIndicator speaker={PLANET_FIGURE_SPEAKER} />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* ── Start Uncovering CTA — pinned to bottom, shown only before conversation starts ── */}
      {messages.length === 0 && (() => {
        const name    = studentFirstName ?? t('travelerName', lang);
        const mission = missionTitle ?? t('thisMissionFallback', lang);
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
        <ChatInputDock
          value={input}
          onChange={setInput}
          onSend={send}
          disabled={loading}
          placeholder={loading
            ? t('figurePlaceholderThinking', lang).replace('{name}', character.name.split(' ')[0])
            : t('askAnythingShort', lang)}
          theme={PLANET_INPUT}
          isRtl={isRtl}
        />
      </div>}
    </div>
  );
}
