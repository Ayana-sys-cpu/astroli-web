'use client';
import { useEffect, useRef, useState } from 'react';
import type { DiveTurn, Segment, SourceEdit } from '@/lib/orin-dive';
import SourceCard from './SourceCard';
import OrinThinking from './OrinThinking';
import OrinText from './OrinText';
import QuietLoader from '@/components/QuietLoader';
import { MediaCard } from './SegmentCard';
import { ListBlock, TableBlock } from './StructuredBlocks';

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
  onSend: (text: string) => void;
  /** Called when the student taps an interactive visual chip — opens the canvas. */
  onOpenVisual: (segment: Extract<Segment, { type: 'visual' }>) => void;
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

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending || hydrating) return;
    setDraft('');
    onSend(trimmed);
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
        <h1 className="text-[13px] text-white" style={{ fontFamily: 'var(--font-space)', fontWeight: 700 }}>
          {topic} <span style={{ color: 'var(--master-purple-orin)' }}>with Orin</span>
        </h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {source && <SourceCard source={source} />}

        {turns.map((turn, i) =>
          turn.segments.map((s, j) => {
            const key = `${i}-${j}`;
            if (s.type === 'text') {
              return (
                <p
                  key={key}
                  className={`m-0 max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                    turn.role === 'student' ? 'ml-auto text-white' : ''
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
                <div key={key} className="flex flex-wrap gap-2">
                  {s.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => send(option)}
                      className="rounded-full border px-4 py-1.5 text-[13px] text-white transition-colors hover:bg-white/10"
                      style={{ borderColor: 'var(--master-magenta-text)', background: '#15151B' }}
                    >
                      {option}
                    </button>
                  ))}
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

      <div
        className="mt-3 flex items-center gap-2 rounded-full px-4 py-2"
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
