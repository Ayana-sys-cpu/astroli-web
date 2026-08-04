'use client';
import { useEffect, useRef, useState } from 'react';
import type { DiveTurn, Segment, SourceEdit } from '@/lib/orin-dive';
import SourceCard from './SourceCard';
import OrinThinking from './OrinThinking';
import OrinText from './OrinText';
import QuietLoader from '@/components/QuietLoader';
import { MediaCard } from './SegmentCard';
import { CalloutBlock, ListBlock, TableBlock } from './StructuredBlocks';
import DepthMeter from './DepthMeter';

interface ChatPaneProps {
  topic: string;
  /** The edit this dive came from, shown in full above the conversation. */
  source?: SourceEdit | null;
  turns: DiveTurn[];
  /** True while the screen is still fetching what already happened in this dive. */
  hydrating?: boolean;
  /** Turns at or past this index arrived live and get the typewriter reveal. */
  animateFrom?: number;
  sending: boolean;
  recharging: boolean;
  onSend: (text: string, action?: 'quiz') => void;
  /** Called when the student taps an interactive visual chip — opens the canvas. */
  onOpenVisual: (segment: Extract<Segment, { type: 'visual' }>) => void;
}

/** The pace controls pinned above the input — how to hear it, not where to go. */
const PACE_CHIPS: Array<{ label: string; text: string; icon: React.ReactNode; action?: 'quiz' }> = [
  { label: 'Simpler', text: 'Make that simpler for me', icon: <ChipIcon d="M12 3l1.9 5.7L19.5 12l-5.6 3.3L12 21l-1.9-5.7L4.5 12l5.6-3.3L12 3z" /> },
  { label: 'Example', text: 'Give me an example', icon: <ChipIcon d="M9 18h6M10 21h4M12 3a6 6 0 0 1 3.6 10.8c-.7.5-1.1 1.3-1.1 2.2H9.5c0-.9-.4-1.7-1.1-2.2A6 6 0 0 1 12 3z" /> },
  { label: 'Quiz me', text: 'Quiz me', action: 'quiz', icon: <ChipIcon d="M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8v.5M12 17h.01M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z" /> },
  { label: 'Game', text: 'Turn what we just learned into a quick mini-game I can play', icon: <ChipIcon d="M6 9h4M8 7v4M15 8h.01M17.5 10.5h.01M7 5h10a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4z" /> },
];

/** Tiny stroke icon for a pace chip — drawn in Orin's purple. */
function ChipIcon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={15}
      height={15}
      fill="none"
      stroke="#C060FF"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

export default function ChatPane({
  topic,
  source = null,
  turns,
  hydrating = false,
  animateFrom = 0,
  sending,
  recharging,
  onSend,
  onOpenVisual,
}: ChatPaneProps) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const scrollDown = () => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });

  useEffect(() => {
    scrollDown();
  }, [turns.length, sending]);

  const send = (text: string, action?: 'quiz') => {
    const trimmed = text.trim();
    if (!trimmed || sending || hydrating) return;
    setDraft('');
    onSend(trimmed, action);
  };

  const isLastTurn = (i: number) => i === turns.length - 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="mb-4 flex items-center gap-2">
        <span
          className="inline-block h-6 w-6 shrink-0 rounded-full"
          style={{ background: 'radial-gradient(circle at 35% 35%, #C060FF, #8B00FF)' }}
          aria-hidden
        />
        <h1
          className="min-w-0 text-[22px] leading-tight text-white"
          style={{ fontFamily: 'var(--font-space)', fontWeight: 700, letterSpacing: '-0.3px' }}
        >
          {topic} <span style={{ color: 'var(--master-purple-orin)' }}>with Orin</span>
        </h1>
        <DepthMeter depth={turns.filter((t) => t.role === 'student').length} />
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {source && <SourceCard source={source} />}

        {turns.map((turn, i) =>
          // Choices always render last in Orin's turn — they are the hook to keep
          // diving, so nothing (image, list, table) may appear below them.
          [...turn.segments]
            .map((s, j) => ({ s, j }))
            .sort((a, b) => Number(a.s.type === 'choices') - Number(b.s.type === 'choices'))
            .map(({ s, j }) => {
            const key = `${i}-${j}`;
            if (s.type === 'text') {
              return (
                <p
                  key={key}
                  className={`m-0 max-w-[85%] rounded-xl ${
                    turn.role === 'student'
                      ? 'ml-auto px-3 py-2 text-[13px] leading-relaxed text-white'
                      : 'px-4 py-3 text-[14px] leading-[1.75]'
                  }`}
                  style={
                    turn.role === 'student'
                      ? { background: '#15151B', border: '1px solid var(--master-magenta-text)' }
                      : { background: 'var(--master-surface)', color: 'var(--master-text-secondary)' }
                  }
                >
                  {turn.role === 'orin' ? (
                    <OrinText text={s.text} animate={i >= animateFrom} onGrow={scrollDown} />
                  ) : (
                    s.text
                  )}
                </p>
              );
            }
            if (s.type === 'list') return <ListBlock key={key} segment={s} />;
            if (s.type === 'table') return <TableBlock key={key} segment={s} />;
            if (s.type === 'callout') return <CalloutBlock key={key} segment={s} />;
            if (s.type === 'media') {
              return (
                <div key={key} className="max-w-[92%]">
                  <MediaCard segment={s} />
                </div>
              );
            }
            if (s.type === 'visual') {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onOpenVisual(s)}
                  className="flex max-w-[85%] items-center gap-2 rounded-xl px-4 py-3 text-left text-[13px] text-white transition-colors hover:bg-white/5"
                  style={{ background: 'var(--master-surface)', border: '1px solid #A855F7' }}
                >
                  <span aria-hidden style={{ color: '#00F5D4' }}>▶</span>
                  <span>
                    {s.title}
                    <span className="block text-[11px]" style={{ color: 'var(--master-text-muted)' }}>
                      Orin built this for you — tap to play
                    </span>
                  </span>
                </button>
              );
            }
            if (s.type === 'choices' && turn.role === 'orin' && isLastTurn(i) && !sending && !recharging) {
              return (
                <div key={key} className="mt-2">
                  <p
                    className="m-0 mb-2 text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--master-text-muted)' }}
                  >
                    Where do you want to go next?
                  </p>
                  <div className="flex flex-col gap-2">
                    {s.options.map((option, idx) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => send(option)}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-[13px] text-white transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
                        style={{
                          background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(0,245,212,0.04))',
                          border: '1px solid rgba(168,85,247,0.3)',
                        }}
                      >
                        <span
                          aria-hidden
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                          style={{ background: 'rgba(168,85,247,0.2)', color: '#A855F7' }}
                        >
                          {idx + 1}
                        </span>
                        <span className="flex-1 leading-snug">{option}</span>
                        <span aria-hidden className="shrink-0 text-[12px]" style={{ color: '#00F5D4' }}>→</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          }),
        )}

        {hydrating && <QuietLoader />}
        {sending && <OrinThinking topic={topic} />}

        {recharging && (
          <p
            className="m-0 max-w-[85%] rounded-xl px-3 py-2 text-[13px]"
            style={{ background: 'var(--master-surface)', color: 'var(--master-text-secondary)' }}
          >
            Orin is recharging — his signal dropped for a moment. Try that again shortly.
          </p>
        )}

        <div ref={endRef} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PACE_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => send(chip.text, chip.action)}
            disabled={sending || hydrating}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] text-white transition-colors hover:bg-white/10 disabled:opacity-40"
            style={{ background: 'var(--master-surface)', border: '1px solid rgba(192,96,255,0.5)' }}
          >
            {chip.icon}
            {chip.label}
          </button>
        ))}
      </div>

      <div
        className="mt-2 flex items-center gap-2 rounded-full px-4 py-2"
        style={{ background: 'var(--master-surface)', border: '1px solid var(--master-hairline)' }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(draft)}
          placeholder="Ask anything…"
          aria-label="Ask Orin about this topic"
          disabled={sending || hydrating}
          maxLength={1000}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none"
        />
        <button
          type="button"
          onClick={() => send(draft)}
          disabled={sending}
          aria-label="Send"
          className="shrink-0 text-[15px] leading-none disabled:opacity-40"
          style={{ color: 'var(--master-magenta-text)' }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
