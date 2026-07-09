'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { OrinMission, OrinPlanet, MissionTerm, WorldBriefItem } from '@/lib/orin-guide-types';
import { t, type Lang } from '@/lib/i18n';
import { getFirstName } from '@/lib/student-store';
import { TermRow } from '@/components/TermRow';
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';

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
  ac:    '#a855f7',
  acDim: 'rgba(168,85,247,0.10)',
  acBdr: 'rgba(168,85,247,0.25)',
} as const;

// =============================================================================
// Types
// =============================================================================

type DockState = 'cta-brief' | 'cta-howto' | 'lock' | 'understand' | 'done';

interface ReturnTrigger {
  type: 'return-planet' | 'return-goals' | 'return-goal' | 'return-no-activity';
  planetName: string | null;
  goalText:   string | null;
  goalCount:  number | null;
}

export interface LockedPlanetSummary {
  planetId:        string;
  planetTitle:     string;
  completedAt:     string;
  insights:        { insightText: string; studentAddition: string | null }[];
  termDefinitions: MissionTerm[];
}

type ChatMsg =
  | { id: string; role: 'pip' | 'user'; type: 'text';    html: string }
  | { id: string; role: 'user';          type: 'chip';    icon: string; text: string }
  | { id: string; role: 'pip';           type: 'brief';   items: WorldBriefItem[]; summary: string }
  | { id: string; role: 'pip';           type: 'mission'; chapter: string; title: string; objective: string; terms?: MissionTerm[] }
  | { id: string; role: 'pip';           type: 'howto';   planets: OrinPlanet[] }
  | { id: string; role: 'pip';           type: 'typing' };

let _idCounter = 0;
function uid() { return `msg_${++_idCounter}_${Date.now()}`; }

function applyTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (str, [k, v]) => str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v),
    template,
  );
}

function formatReturnMessage(rt: ReturnTrigger, lang: Lang): string {
  switch (rt.type) {
    case 'return-planet':
      return applyTemplate(t('returnPlanet', lang), { planetName: rt.planetName ?? '' });
    case 'return-goals':
      return applyTemplate(t('returnMultiGoals', lang), { goalText: rt.goalText ?? '' });
    case 'return-goal':
      return applyTemplate(t('returnOneGoal', lang), { goalText: rt.goalText ?? '' });
    default:
      return t('returnNoActivity', lang);
  }
}

export interface PipGuidePanelProps {
  missionId?: string;
  missionOrder: number;
  firstPlanet?: { id: string; label: string };
  onLaunch?: () => void;
  language?: Lang;
}

// =============================================================================
// Pip avatar orb
// =============================================================================

function PipOrb({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'radial-gradient(circle at 35% 35%, #e9d5ff, #7c3aed 60%, #2e1065)',
      boxShadow: `0 0 ${size * 0.6}px rgba(168,85,247,0.55)`,
      border: `1px solid rgba(168,85,247,0.5)`,
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

function WorldBrief({ items, summary, lang }: { items: WorldBriefItem[]; summary: string; lang: Lang }) {
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
            {t('worldBriefLabel', lang)}
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

function MissionCard({ chapter, title, objective, terms, lang }: { chapter: string; title: string; objective: string; terms?: MissionTerm[]; lang: Lang }) {
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
        <span style={{ fontSize: 9, color: T.tm, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('missionProject', lang)}</span>
      </div>
      <div style={{ fontSize: 19, fontWeight: 900, color: T.tp, lineHeight: 1.2, marginBottom: 10 }}>
        {title}
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.65, color: T.ts, margin: 0 }}>
        {objective}
      </p>
      {terms && terms.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid rgba(255,255,255,0.06)` }}>
          <div style={{
            fontSize: 9, fontWeight: 800, color: T.ac,
            textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8,
          }}>
            {t('keyTermsLabel', lang)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {terms.map((term, i) => <TermRow key={i} term={term} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// How-To Card — CHANGE 5: elaborate text, single planet suggestion
// =============================================================================

function HowToCard({ planets, firstPlanet, lang }: { planets: OrinPlanet[]; firstPlanet?: { id: string; label: string }; lang: Lang }) {
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
        {t('howToExplore', lang)}
      </div>

      <p style={{ fontSize: 13, color: T.ts, margin: '0 0 10px', lineHeight: 1.6 }}>
        {t('howToBody', lang)}{' '}
        <strong style={{ color: T.tp }}>{t('clickAnyPlanet', lang)}</strong>{' '}
        {t('howToBodyCont', lang)}
      </p>

      <p style={{ fontSize: 13, color: T.ts, margin: '0 0 10px', lineHeight: 1.5 }}>
        {t('suggestStartWith', lang)}
      </p>

      {suggested && (
        <motion.div
          whileHover={{ borderColor: 'rgba(168,85,247,0.35)', x: 2 }}
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
          <span style={{ fontSize: 10, color: 'rgba(168,85,247,0.7)', letterSpacing: '0.08em' }}>{t('exploreArrow', lang)}</span>
        </motion.div>
      )}
    </div>
  );
}

// =============================================================================
// Message bubble — dispatches to correct renderer per type
// =============================================================================

function MessageBubble({ msg, firstPlanet, lang }: { msg: ChatMsg; firstPlanet?: { id: string; label: string }; lang: Lang }) {
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
            <WorldBrief items={msg.items} summary={msg.summary} lang={lang} />
          </div>
        </div>
      );
    case 'mission':
      return (
        <div className="flex items-start gap-2 px-4">
          <PipOrb size={24} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <MissionCard chapter={msg.chapter} title={msg.title} objective={msg.objective} terms={msg.terms} lang={lang} />
          </div>
        </div>
      );
    case 'howto':
      return (
        <div className="flex items-start gap-2 px-4">
          <PipOrb size={24} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <HowToCard planets={msg.planets} firstPlanet={firstPlanet} lang={lang} />
          </div>
        </div>
      );
    default:
      return null;
  }
}

// =============================================================================
// All Discoveries overlay
// =============================================================================

export function AllDiscoveriesView({ summaries, pipHistory, onClose, lang }: { summaries: LockedPlanetSummary[]; pipHistory?: { html: string }[]; onClose: () => void; lang: Lang }) {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 30,
        background: 'rgba(5,5,16,0.97)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        padding: '20px 16px',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.tp }}>{t('whatIDiscoveredAll', lang)}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: `1px solid ${T.b2}`, borderRadius: 8,
            color: T.ts, fontSize: 12, cursor: 'pointer', padding: '5px 12px',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.ac; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.b2; }}
        >{t('closeReview', lang)}</button>
      </div>

      {summaries.length === 0 ? (
        <p style={{ fontSize: 13, color: T.ts, textAlign: 'center', marginTop: 40 }}>
          {t('noDiscoveriesYet', lang)}
        </p>
      ) : (
        summaries.map(s => (
          <div key={s.planetId} style={{ background: T.s2, border: `1px solid ${T.b1}`, borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.ac, marginBottom: 10, letterSpacing: '0.06em' }}>
              {s.planetTitle}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {s.insights.map((insight, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, padding: '14px 16px',
                }}>
                  <p style={{ fontSize: 13, color: T.tp, lineHeight: 1.65, margin: 0 }}>
                    {insight.studentAddition ?? insight.insightText}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push(`/landscape/${s.planetId}`)}
              style={{
                width: '100%', marginTop: 12, padding: '11px 14px', borderRadius: 12,
                background: T.acDim, border: `1.5px solid ${T.acBdr}`,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,212,0.18)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.acDim; }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.ac }}>{t('reviewPlanetCta', lang)}</div>
                <div style={{ fontSize: 10, color: T.ts, marginTop: 2 }}>{t('reviewPlanetCtaSubtitle', lang)}</div>
              </div>
            </button>
          </div>
        ))
      )}

      {/* Pip conversation history (T020) */}
      {pipHistory && pipHistory.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{
            fontSize: 9, fontWeight: 800, color: T.ts,
            textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10,
          }}>
            {t('whatPipToldMe', lang)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pipHistory.map((m, idx) => (
              <div key={idx} style={{
                background: T.s2, border: `1px solid ${T.b1}`,
                borderRadius: '4px 14px 14px 14px', padding: '12px 14px',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <PipOrb size={20} />
                <p
                  style={{ fontSize: 12, color: T.ts, lineHeight: 1.65, margin: 0 }}
                  dangerouslySetInnerHTML={{ __html: m.html }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// =============================================================================
// Dock components
// =============================================================================

function CtaBriefDock({ onGenerate, lang }: { onGenerate: () => void; lang: Lang }) {
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
        <div style={{ fontSize: 13, fontWeight: 700, color: T.tp }}>{t('generateWorldBrief', lang)}</div>
        <div style={{ fontSize: 11, color: T.ts, marginTop: 2 }}>{t('worldBriefSubtitle', lang)}</div>
      </div>
      <span style={{ color: T.ac, fontSize: 16 }}>→</span>
    </button>
  );
}

function CtaHowtoDock({ onShowHowTo, onSend, lang }: { onShowHowTo: () => void; onSend: (text: string) => void; lang: Lang }) {
  const [hovered, setHovered] = useState(false);
  const [val, setVal] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextarea(inputRef, val);

  const send = () => {
    if (!val.trim()) return;
    onSend(val.trim());
    setVal('');
    inputRef.current?.focus();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        onClick={onShowHowTo}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          background: hovered ? 'rgba(0,212,212,0.18)' : 'rgba(0,212,212,0.13)',
          border: `1.5px solid ${hovered ? 'rgba(0,212,212,0.65)' : 'rgba(0,212,212,0.50)'}`,
          borderRadius: 14, cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: T.ac }}>{t('howToExplore', lang)}</span>
        <span style={{ color: T.ac, fontSize: 16 }}>→</span>
      </button>

      <div style={{
        display: 'flex', gap: 8, alignItems: 'flex-end',
        background: T.s2, border: `1px solid ${T.b1}`,
        borderRadius: 12, padding: '10px 4px 10px 14px',
      }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={t('askAnythingShort', lang)}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            resize: 'none', overflowY: 'auto',
            fontSize: 13, lineHeight: 1.4, color: T.tp,
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
    </div>
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

function UnderstandDock({ onGotIt, onSend, lang }: { onGotIt: () => void; onSend: (text: string) => void; lang: Lang }) {
  const [val, setVal] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextarea(inputRef, val);

  const send = () => {
    if (!val.trim()) return;
    onSend(val.trim());
    setVal('');
    inputRef.current?.focus();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex', gap: 8, alignItems: 'flex-end',
        background: T.s2, border: `1px solid ${T.b1}`,
        borderRadius: 12, padding: '10px 4px 10px 14px',
      }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={t('askAnythingEra', lang)}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            resize: 'none', overflowY: 'auto',
            fontSize: 13, lineHeight: 1.4, color: T.tp,
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
        {t('gotItReady', lang)}
      </button>
    </div>
  );
}

function DoneDock({ lang }: { lang: Lang }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 0' }}>
      <span style={{ fontSize: 11, color: T.ts, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {t('missionActive', lang)}
      </span>
    </div>
  );
}

// =============================================================================
// Celebration overlay — fixed full-viewport, escapes the sidebar container
// =============================================================================

function CelebrationOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(5,5,16,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: [1, 4.5, 4], opacity: [1, 1, 0] }}
        transition={{ duration: 2.2, ease: 'easeInOut' }}
        style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #00ffff, #0088aa 60%, #003344)',
          boxShadow: '0 0 60px rgba(0,212,212,0.9), 0 0 120px rgba(0,212,212,0.5)',
        }}
      />
    </motion.div>
  );
}

// =============================================================================
// PipGuidePanel — sidebar-embedded component (no full-page wrapper or header)
// CHANGE 4: flex-1 + overflow-y-auto for scrollable content area
// =============================================================================

export default function PipGuidePanel({ missionId, missionOrder, firstPlanet, onLaunch, language }: PipGuidePanelProps) {
  const lang: Lang = language ?? 'en';
  const [mission,            setMission]            = useState<OrinMission | null>(null);
  const [hasConfirmed,       setHasConfirmed]       = useState<boolean | null>(null); // null = loading
  const [returnTrigger,      setReturnTrigger]      = useState<ReturnTrigger | null>(null);
  const [showCelebration,    setShowCelebration]    = useState(false);

  const [messages,           setMessages]           = useState<ChatMsg[]>([]);
  const [hasPipHistory,      setHasPipHistory]      = useState(false);
  const [dock,               setDock]               = useState<DockState>('cta-howto');
  const [qaIdx,              setQaIdx]              = useState(0);
  const [allSummaries,       setAllSummaries]       = useState<LockedPlanetSummary[]>([]);
  const [showAllDiscoveries, setShowAllDiscoveries] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const push = useCallback((msg: ChatMsg) => {
    setMessages((prev) => [...prev.filter((m) => m.type !== 'typing'), msg]);
  }, []);

  const savePip = useCallback((content: string, triggerType: string) => {
    if (!missionId) return;
    fetch('/api/student/pip-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId, messages: [{ role: 'pip', content, triggerType }] }),
    });
  }, [missionId]);

  const showTyping = useCallback(() => {
    setMessages((prev) => [
      ...prev.filter((m) => m.type !== 'typing'),
      { id: uid(), role: 'pip', type: 'typing' },
    ]);
  }, []);

  // ── Fetch mission data + mission state in parallel ─────────────────────────
  useEffect(() => {
    const langParam = lang === 'he' ? '&lang=he' : '';
    const missionUrl = missionId
      ? `/api/mission?missionId=${missionId}${langParam}`
      : `/api/mission?order=${missionOrder}${langParam}`;
    const stateUrl = missionId ? `/api/student/mission-state?missionId=${missionId}` : null;

    Promise.all([
      fetch(missionUrl).then((r) => r.json()),
      stateUrl ? fetch(stateUrl).then((r) => r.json()).catch(() => null) : Promise.resolve(null),
    ])
      .then(([missionData, stateData]) => {
        setMission(missionData);
        const confirmed = !!stateData?.confirmedAt;
        setHasConfirmed(confirmed);
        if (stateData?.returnTrigger) setReturnTrigger(stateData.returnTrigger);
        // Pre-load persisted Pip message history (T019)
        if (stateData?.pipMessages?.length > 0) {
          setHasPipHistory(true);
          setMessages(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            stateData.pipMessages.map((m: any) => ({
              id:   uid(),
              role: m.role === 'student' ? 'user' : 'pip',
              type: 'text',
              html: m.content,
            }))
          );
        }
      })
      .catch(console.error);
  }, [missionId, missionOrder, lang]);

  // ── Show opening sequence once both mission data and state are loaded ──────
  // Gates on hasConfirmed !== null so we never fire before mission-state resolves.
  useEffect(() => {
    if (!mission || hasConfirmed === null || hasPipHistory) return;

    if (hasConfirmed) {
      // Return visitor — show context-aware return message (T015)
      const html = returnTrigger ? formatReturnMessage(returnTrigger, lang) : t('returnNoActivity', lang);
      const triggerType = returnTrigger ? `return-${returnTrigger.type}` : 'return-no-activity';
      const t1 = setTimeout(() => showTyping(), 300);
      const t2 = setTimeout(() => {
        push({ id: uid(), role: 'pip', type: 'text', html });
        savePip(html, triggerType);
        setDock('cta-howto');
      }, 1400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }

    // First-time visitor — existing opening flow
    const t1 = setTimeout(() => showTyping(), 300);
    const t2 = setTimeout(() => {
      const rawFirst = getFirstName();
      const firstName = rawFirst && !rawFirst.includes(' ') && rawFirst.includes('.')
        ? rawFirst.split('.')[0].replace(/^./, (c: string) => c.toUpperCase())
        : rawFirst;
      const html = mission.openingMessage
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\[שם תלמיד\]/g, firstName)
        .replace(/\[student name\]/gi, firstName)
        .replace(/\n/g, '<br>');
      push({ id: uid(), role: 'pip', type: 'text', html });
      savePip(html, 'opening');
      setDock('cta-howto');
    }, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission, hasConfirmed, hasPipHistory, savePip]);

  async function handleViewDiscoveries() {
    try {
      const res = await fetch('/api/student/planet-summaries');
      const data = await res.json();
      setAllSummaries(data.summaries ?? []);
    } catch {
      setAllSummaries([]);
    }
    setShowAllDiscoveries(true);
  }

  function handleGenerateBrief() {
    setDock('lock');
    push({ id: uid(), role: 'user', type: 'chip', icon: '🌐', text: t('generateWorldBrief', lang) });
    setTimeout(showTyping, 400);
    setTimeout(() => {
      push({ id: uid(), role: 'pip', type: 'brief', items: mission!.worldBriefItems, summary: mission!.worldBriefSummary });
      setTimeout(showTyping, 300);
      setTimeout(() => {
        const briefText = t('takeYourTime', lang);
        push({ id: uid(), role: 'pip', type: 'text', html: briefText });
        savePip(briefText, 'brief');
        setDock('understand');
      }, 1300);
    }, 1700);
  }

  function handleShowHowTo() {
    push({ id: uid(), role: 'user', type: 'chip', icon: '🔭', text: t('howToExplore', lang) });
    setTimeout(showTyping, 300);
    setTimeout(() => {
      push({ id: uid(), role: 'pip', type: 'howto', planets: mission!.planets });
      setDock('understand');
    }, 1400);
  }

  function handleHowToSend(text: string) {
    setDock('understand');
    handleQA(text);
  }

  function handleQA(text: string) {
    push({ id: uid(), role: 'user', type: 'text', html: text });
    const ans = mission!.qaAnswers[qaIdx % mission!.qaAnswers.length];
    setQaIdx((q) => q + 1);
    setTimeout(showTyping, 400);
    setTimeout(() => {
      push({ id: uid(), role: 'pip', type: 'text', html: ans });
      savePip(ans, 'qa');
    }, 1900);
  }

  function handleGotIt() {
    // Show celebration overlay; after it fades, push message + save to DB (T010)
    setShowCelebration(true);
    const celebrationText = t('celebrationMessage', lang);
    setTimeout(() => {
      setShowCelebration(false);
      push({ id: uid(), role: 'pip', type: 'text', html: celebrationText });
      setDock('done');
      setHasConfirmed(true);
      if (missionId) {
        fetch('/api/student/mission-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ missionId }),
        });
        fetch('/api/student/pip-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ missionId, messages: [{ role: 'pip', content: celebrationText, triggerType: 'celebration' }] }),
        });
      }
    }, 2500);
  }

  function renderDock() {
    switch (dock) {
      case 'cta-brief':  return null;
      case 'cta-howto':  return <CtaHowtoDock onShowHowTo={handleShowHowTo} onSend={handleHowToSend} lang={lang} />;
      case 'lock':       return <LockDock />;
      case 'understand': return <UnderstandDock onGotIt={handleGotIt} onSend={handleQA} lang={lang} />;
      case 'done':       return <DoneDock lang={lang} />;
    }
  }

  // ── Loading guard ──────────────────────────────────────────────────────────
  if (!mission) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden items-center justify-center">
        <div style={{ color: '#00d4d4', fontSize: 12, letterSpacing: '0.2em', opacity: 0.6 }}>{t('loading', lang)}</div>
      </div>
    );
  }

  return (
    // flex column fills the sidebar, content area scrolls; relative for AllDiscoveriesView overlay
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative" dir={lang === 'he' ? 'rtl' : 'ltr'}>

      {/* Celebration overlay — fixed, escapes sidebar bounds (T009) */}
      <AnimatePresence>
        {showCelebration && <CelebrationOverlay onDone={() => setShowCelebration(false)} />}
      </AnimatePresence>

      {/* All Discoveries overlay */}
      <AnimatePresence>
        {showAllDiscoveries && (
          <AllDiscoveriesView
            summaries={allSummaries}
            pipHistory={messages.filter((m) => m.role === 'pip' && m.type === 'text') as { html: string }[]}
            onClose={() => setShowAllDiscoveries(false)}
            lang={lang}
          />
        )}
      </AnimatePresence>

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
              <MessageBubble msg={msg} firstPlanet={firstPlanet} lang={lang} />
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* Dock — stays pinned at bottom */}
      <div className="border-t border-white/5 p-3 flex-shrink-0 flex flex-col gap-2">
        {/* Discovery button — always visible in every dock state (T021) */}
        <button
          onClick={handleViewDiscoveries}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'rgba(155,92,255,0.08)',
            border: '1.5px solid rgba(155,92,255,0.35)',
            borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(155,92,255,0.15)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(155,92,255,0.08)'; }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#c084fc' }}>{t('whatIDiscoveredAll', lang)}</div>
          <span style={{ fontSize: 14, color: '#c084fc' }}>✦</span>
        </button>

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
