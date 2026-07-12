'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { OrinMission, OrinPlanet, MissionTerm } from '@/lib/orin-guide-types';
import { t, type Lang } from '@/lib/i18n';
import { getFirstName, getBotName } from '@/lib/student-store';
import { getSessionStudentId } from '@/lib/session';
import { askOrin } from '@/lib/orin-qa';
import { TermRow } from '@/components/TermRow';
import { ChatAvatarOrb } from '@/components/chat/ChatAvatarOrb';
import { CharacterMessageRow } from '@/components/chat/CharacterMessageRow';
import { CharacterMessageBubble } from '@/components/chat/CharacterMessageBubble';
import { ChatTypingIndicator } from '@/components/chat/ChatTypingIndicator';
import { StudentMessageBubble } from '@/components/chat/StudentMessageBubble';
import { ChatInputDock } from '@/components/chat/ChatInputDock';
import { ORIN_GUIDE_SPEAKER, ORIN_GUIDE_STUDENT, ORIN_GUIDE_INPUT } from '@/components/chat/chat-themes';

// =============================================================================
// Design tokens — used by OrinGuidePanel
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
  tm:    '#5c6f85',
  ac:    '#a855f7',
  acDim: 'rgba(168,85,247,0.10)',
  acBdr: 'rgba(168,85,247,0.25)',
} as const;

// =============================================================================
// Types
// =============================================================================

type DockState = 'cta-howto' | 'lock' | 'understand' | 'done';

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
  | { id: string; role: 'orin' | 'user'; type: 'text';    html: string }
  | { id: string; role: 'user';          type: 'chip';    icon: string; text: string }
  | { id: string; role: 'orin';           type: 'mission'; chapter: string; title: string; objective: string; terms?: MissionTerm[] }
  | { id: string; role: 'orin';           type: 'howto';   planets: OrinPlanet[] }
  | { id: string; role: 'orin';           type: 'typing' };

let _idCounter = 0;
function uid() { return `msg_${++_idCounter}_${Date.now()}`; }

// All chat messages pass through sanitizeHtml before dangerouslySetInnerHTML.
// escapeHtml is used when converting plain text (student input, bot replies) into
// the html field so entities are preserved after sanitizeHtml's DOMParser round-trip.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Only these tags are allowed in chat messages.
// All attributes are stripped; everything else is flattened to text.
const SAFE_TAGS = new Set(['br', 'strong', 'em', 'b', 'i']);

function sanitizeHtml(raw: string): string {
  // SSR fallback: chat content is never present during SSR, so plain text is fine.
  if (typeof document === 'undefined') return raw.replace(/<[^>]*>/g, '');
  const { body } = new DOMParser().parseFromString(raw, 'text/html');
  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent ?? '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(walk).join('');
    if (!SAFE_TAGS.has(tag)) return inner;
    return tag === 'br' ? '<br>' : `<${tag}>${inner}</${tag}>`;
  }
  return Array.from(body.childNodes).map(walk).join('');
}

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

// Pre-fetched mission-state passed from the landscape page (mirrors GET /api/student/mission-state).
// Wire format: the field name `pipMessages` and role value 'pip' are the guide's
// legacy name, kept for the pip_messages DB table and shipped mobile clients.
// In UI code the character is always Orin.
export interface MissionStatePayload {
  confirmedAt: string | null;
  returnTrigger: ReturnTrigger | null;
  pipMessages: Array<{ id: string; role: 'pip' | 'student'; content: string; triggerType: string; createdAt: string }>;
}

export interface OrinGuidePanelProps {
  missionId?: string;
  missionOrder: number;
  firstPlanet?: { id: string; label: string };
  onLaunch?: () => void;
  language?: Lang;
  /** Student's circular avatar image URL — replaces the generic purple orb in messages. */
  avatarUrl?: string | null;
  /** Called each time Orin pushes a real message — used by the parent to replay the avatar video. */
  onOrinMessage?: () => void;
  /** Pre-fetched by the landscape page. null = parent loading (wait). undefined = self-fetch. */
  orinMission?: OrinMission | null;
  /** Pre-fetched by the landscape page. null = parent loading (wait). undefined = self-fetch. */
  initialMissionState?: MissionStatePayload | null;
}

// =============================================================================
// Orin avatar — circular image when avatarUrl is available, purple orb fallback
// =============================================================================

function OrinAvatar({ size = 28, avatarUrl }: { size?: number; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt="Orin"
        style={{
          width: size, height: size, borderRadius: '50%', flexShrink: 0,
          objectFit: 'cover',
          border: '1px solid rgba(168,85,247,0.5)',
        }}
      />
    );
  }
  return <ChatAvatarOrb theme={ORIN_GUIDE_SPEAKER.orb} size={size} />;
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
          fontSize: 11, fontWeight: 800, color: T.ac,
          background: T.acDim, border: `1px solid ${T.acBdr}`,
          padding: '3px 8px', borderRadius: 20,
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>{chapter}</span>
        <span style={{ fontSize: 11, color: T.tm, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('missionProject', lang)}</span>
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
            fontSize: 11, fontWeight: 800, color: T.ac,
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
        fontSize: 11, fontWeight: 800, color: T.ts,
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
          onClick={() => firstPlanet && router.push(`/landscape/${firstPlanet.id}?lang=${lang}`)}
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

function MessageBubble({ msg, firstPlanet, lang, avatarUrl }: { msg: ChatMsg; firstPlanet?: { id: string; label: string }; lang: Lang; avatarUrl?: string | null }) {
  const avatar = <OrinAvatar size={24} avatarUrl={avatarUrl} />;

  if (msg.type === 'typing') return <ChatTypingIndicator speaker={ORIN_GUIDE_SPEAKER} avatar={avatar} />;

  if (msg.role === 'user') {
    if (msg.type === 'chip') {
      return <StudentMessageBubble theme={ORIN_GUIDE_STUDENT} icon={msg.icon}>{msg.text}</StudentMessageBubble>;
    }
    return <StudentMessageBubble theme={ORIN_GUIDE_STUDENT}>{msg.html}</StudentMessageBubble>;
  }

  switch (msg.type) {
    case 'text':
      return <CharacterMessageBubble speaker={ORIN_GUIDE_SPEAKER} avatar={avatar} html={sanitizeHtml(msg.html)} maxWidth="90%" />;
    case 'mission':
      return (
        <CharacterMessageRow speaker={ORIN_GUIDE_SPEAKER} avatar={avatar}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <MissionCard chapter={msg.chapter} title={msg.title} objective={msg.objective} terms={msg.terms} lang={lang} />
          </div>
        </CharacterMessageRow>
      );
    case 'howto':
      return (
        <CharacterMessageRow speaker={ORIN_GUIDE_SPEAKER} avatar={avatar}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <HowToCard planets={msg.planets} firstPlanet={firstPlanet} lang={lang} />
          </div>
        </CharacterMessageRow>
      );
    default:
      return null;
  }
}

// =============================================================================
// All Discoveries overlay
// =============================================================================

export function AllDiscoveriesView({ summaries, orinHistory, onClose, lang, botName, avatarUrl }: { summaries: LockedPlanetSummary[]; orinHistory?: { html: string }[]; onClose: () => void; lang: Lang; botName?: string; avatarUrl?: string | null }) {
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
              onClick={() => router.push(`/landscape/${s.planetId}?lang=${lang}`)}
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

      {/* Orin conversation history (T020) */}
      {orinHistory && orinHistory.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: T.ts,
            textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10,
          }}>
            {t('whatOrinToldMe', lang).replace('{name}', botName ?? 'Orin')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orinHistory.map((m, idx) => (
              <div key={idx} style={{
                background: T.s2, border: `1px solid ${T.b1}`,
                borderRadius: '4px 14px 14px 14px', padding: '12px 14px',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <OrinAvatar size={20} avatarUrl={avatarUrl} />
                <p
                  style={{ fontSize: 12, color: T.ts, lineHeight: 1.65, margin: 0 }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.html) }}
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

function CtaHowtoDock({ onShowHowTo, onSend, lang }: { onShowHowTo: () => void; onSend: (text: string) => void; lang: Lang }) {
  const [hovered, setHovered] = useState(false);
  const [draft, setDraft] = useState('');

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

      <ChatInputDock
        value={draft}
        onChange={setDraft}
        onSend={() => { onSend(draft.trim()); setDraft(''); }}
        placeholder={t('askAnythingShort', lang)}
        theme={ORIN_GUIDE_INPUT}
      />
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

function UnderstandDock({ onGotIt, onSend, onInvestigate, lang }: { onGotIt: () => void; onSend: (text: string) => void; onInvestigate?: () => void; lang: Lang }) {
  const [draft, setDraft] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <ChatInputDock
        value={draft}
        onChange={setDraft}
        onSend={() => { onSend(draft.trim()); setDraft(''); }}
        placeholder={t('askAnythingEra', lang)}
        theme={ORIN_GUIDE_INPUT}
      />

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

      {onInvestigate && (
        <button
          onClick={onInvestigate}
          style={{
            width: '100%', padding: '13px 18px', borderRadius: 12,
            background: 'rgba(168,85,247,0.12)', border: `1.5px solid rgba(168,85,247,0.40)`,
            color: T.ac, fontSize: 14, fontWeight: 800, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(168,85,247,0.22)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(168,85,247,0.12)'; }}
        >
          {t('letsInvestigate', lang)}
        </button>
      )}
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
// OrinGuidePanel — sidebar-embedded component (no full-page wrapper or header)
// CHANGE 4: flex-1 + overflow-y-auto for scrollable content area
// =============================================================================

export default function OrinGuidePanel({ missionId, missionOrder, firstPlanet, onLaunch, language, avatarUrl, onOrinMessage, orinMission, initialMissionState }: OrinGuidePanelProps) {
  const lang: Lang = language ?? 'en';
  const router = useRouter();
  const botName = getBotName();
  const onOrinMessageRef = useRef(onOrinMessage);
  const [mission,            setMission]            = useState<OrinMission | null>(null);
  const [hasConfirmed,       setHasConfirmed]       = useState<boolean | null>(null); // null = loading
  const [returnTrigger,      setReturnTrigger]      = useState<ReturnTrigger | null>(null);

  const [messages,           setMessages]           = useState<ChatMsg[]>([]);
  const [hasOrinHistory,      setHasOrinHistory]      = useState(false);
  const [dock,               setDock]               = useState<DockState>('cta-howto');
  const [qaIdx,              setQaIdx]              = useState(0);
  const [allSummaries,       setAllSummaries]       = useState<LockedPlanetSummary[]>([]);
  const [showAllDiscoveries, setShowAllDiscoveries] = useState(false);
  const [hasDiscoveries,     setHasDiscoveries]     = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Keep onOrinMessage ref current so push() doesn't need it as a dep
  useEffect(() => { onOrinMessageRef.current = onOrinMessage; }, [onOrinMessage]);

  // Check on mount whether the student has any saved discoveries
  useEffect(() => {
    fetch(`/api/student/planet-summaries?lang=${lang}`)
      .then((r) => r.json())
      .then((data) => setHasDiscoveries((data.summaries ?? []).length > 0))
      .catch(() => setHasDiscoveries(false));
  }, [lang]);

  const push = useCallback((msg: ChatMsg) => {
    setMessages((prev) => [...prev.filter((m) => m.type !== 'typing'), msg]);
    if (msg.role === 'orin' && msg.type !== 'typing') {
      onOrinMessageRef.current?.();
    }
  }, []);

  const saveOrinMessage = useCallback((content: string, triggerType: string) => {
    if (!missionId) return;
    // role 'pip' is the wire/DB value (pip_messages CHECK constraint) — the character is Orin.
    fetch('/api/student/pip-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId, messages: [{ role: 'pip', content, triggerType }] }),
    });
  }, [missionId]);

  const showTyping = useCallback(() => {
    setMessages((prev) => [
      ...prev.filter((m) => m.type !== 'typing'),
      { id: uid(), role: 'orin', type: 'typing' },
    ]);
  }, []);

  // ── Apply mission state payload (shared by both code paths below) ──────────
  const applyStatePayload = useCallback((stateData: MissionStatePayload | null) => {
    setHasConfirmed(!!stateData?.confirmedAt);
    if (stateData?.returnTrigger) setReturnTrigger(stateData.returnTrigger);
    if (stateData?.pipMessages?.length) {
      setHasOrinHistory(true);
      setMessages(stateData.pipMessages.map((m) => ({
        id:   uid(),
        role: m.role === 'student' ? ('user' as const) : ('orin' as const),
        type: 'text' as const,
        html: m.content,
      })));
    }
  }, []);

  // ── Fetch mission data + mission state in parallel ─────────────────────────
  // When the landscape page pre-fetches both (orinMission/initialMissionState props),
  // apply them directly and skip the network calls.  null = parent still loading
  // (wait for next render).  undefined = not provided → self-fetch as before.
  useEffect(() => {
    if (orinMission !== undefined) {
      if (!orinMission) return; // parent still loading — wait
      setMission(orinMission);
      if (initialMissionState === undefined) return; // not managed by parent — shouldn't happen
      if (!initialMissionState) return;              // parent still loading state — wait
      applyStatePayload(initialMissionState);
      return;
    }

    // Self-fetch fallback for callers that don't pre-fetch (e.g. pip-guide page)
    const langParam = `&lang=${lang}`;
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
        applyStatePayload(stateData);
      })
      .catch(console.error);
  }, [missionId, missionOrder, lang, orinMission, initialMissionState, applyStatePayload]);

  // ── Show opening sequence once both mission data and state are loaded ──────
  // Gates on hasConfirmed !== null so we never fire before mission-state resolves.
  useEffect(() => {
    if (!mission || hasConfirmed === null || hasOrinHistory) return;

    if (hasConfirmed) {
      // Return visitor — show context-aware return message; skip the how-to (they already know)
      const html = returnTrigger ? formatReturnMessage(returnTrigger, lang) : t('returnNoActivity', lang);
      const triggerType = returnTrigger ? `return-${returnTrigger.type}` : 'return-no-activity';
      const t1 = setTimeout(() => showTyping(), 300);
      const t2 = setTimeout(() => {
        push({ id: uid(), role: 'orin', type: 'text', html });
        saveOrinMessage(html, triggerType);
        setDock('done');
      }, 1400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }

    // First-time visitor — opening message, then how-to card appears automatically
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
      push({ id: uid(), role: 'orin', type: 'text', html });
      saveOrinMessage(html, 'opening');
    }, 1600);
    const t3 = setTimeout(() => showTyping(), 2000);
    const t4 = setTimeout(() => {
      push({ id: uid(), role: 'orin', type: 'howto', planets: mission.planets });
      setDock('understand');
    }, 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission, hasConfirmed, hasOrinHistory, saveOrinMessage]);

  async function handleViewDiscoveries() {
    try {
      const res = await fetch(`/api/student/planet-summaries?lang=${lang}`);
      const data = await res.json();
      const summaries = data.summaries ?? [];
      setAllSummaries(summaries);
      setHasDiscoveries(summaries.length > 0);
    } catch {
      setAllSummaries([]);
    }
    setShowAllDiscoveries(true);
  }

  function handleShowHowTo() {
    push({ id: uid(), role: 'user', type: 'chip', icon: '🔭', text: t('howToExplore', lang) });
    setTimeout(showTyping, 300);
    setTimeout(() => {
      push({ id: uid(), role: 'orin', type: 'howto', planets: mission!.planets });
      setDock('understand');
    }, 1400);
  }

  function handleHowToSend(text: string) {
    setDock('understand');
    handleQA(text);
  }

  async function handleQA(text: string) {
    push({ id: uid(), role: 'user', type: 'text', html: escapeHtml(text) });
    setTimeout(showTyping, 400);

    const studentId = await getSessionStudentId();
    const liveAnswer = studentId && mission
      ? await askOrin({
          studentId,
          message:         text,
          missionQuestion: mission.question,
          planetNames:     mission.planets.map((p) => p.name),
          language:        lang,
        })
      : null;

    // Scripted mission answers remain the offline fallback, so the student
    // still gets a reply when the bot is unreachable, capped, or unauthenticated.
    const ans = liveAnswer ? escapeHtml(liveAnswer) : mission!.qaAnswers[qaIdx % mission!.qaAnswers.length];
    if (!liveAnswer) setQaIdx((q) => q + 1);

    push({ id: uid(), role: 'orin', type: 'text', html: ans });
    saveOrinMessage(ans, 'qa');
  }

  function handleGotIt() {
    if (missionId) {
      fetch('/api/student/mission-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId }),
      });
    }
    onLaunch?.();
  }

  function handleInvestigate() {
    if (missionId) {
      fetch('/api/student/mission-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId }),
      });
    }
    if (firstPlanet) {
      router.push(`/landscape/${firstPlanet.id}?lang=${lang}`);
    }
  }

  function renderDock() {
    switch (dock) {
      case 'cta-howto':  return <CtaHowtoDock onShowHowTo={handleShowHowTo} onSend={handleHowToSend} lang={lang} />;
      case 'lock':       return <LockDock />;
      case 'understand': return <UnderstandDock onGotIt={handleGotIt} onSend={handleQA} onInvestigate={firstPlanet ? handleInvestigate : undefined} lang={lang} />;
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

      {/* All Discoveries overlay */}
      <AnimatePresence>
        {showAllDiscoveries && (
          <AllDiscoveriesView
            summaries={allSummaries}
            orinHistory={messages.filter((m) => m.role === 'orin' && m.type === 'text') as { html: string }[]}
            onClose={() => setShowAllDiscoveries(false)}
            lang={lang}
            botName={botName}
            avatarUrl={avatarUrl}
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
              <MessageBubble msg={msg} firstPlanet={firstPlanet} lang={lang} avatarUrl={avatarUrl} />
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* Dock — stays pinned at bottom */}
      <div className="border-t border-white/5 p-3 flex-shrink-0 flex flex-col gap-2">
        {/* Discovery button — shown only once the student has at least one saved discovery */}
        <AnimatePresence mode="wait">
          {hasDiscoveries === true ? (
            <motion.button
              key="discoveries-btn"
              onClick={handleViewDiscoveries}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(155,92,255,0.08)',
                border: '1.5px solid rgba(155,92,255,0.35)',
                borderRadius: 12, cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(155,92,255,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(155,92,255,0.08)'; }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#c084fc' }}>{t('whatIDiscoveredAll', lang)}</div>
              <span style={{ fontSize: 14, color: '#c084fc' }}>✦</span>
            </motion.button>
          ) : hasDiscoveries === false ? (
            <motion.p
              key="discoveries-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ fontSize: 11, color: T.tm, textAlign: 'center', margin: 0, padding: '6px 4px' }}
            >
              {t('discoveriesHint', lang)}
            </motion.p>
          ) : null}
        </AnimatePresence>

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
