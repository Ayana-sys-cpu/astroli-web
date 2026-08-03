'use client';
import { useEffect, useRef, useState } from 'react';
import type { DiveTurn, SourceEdit } from '@/lib/orin-dive';
import SourceCard from './SourceCard';
import OrinThinking from './OrinThinking';
import OrinText from './OrinText';

interface ChatPaneProps {
  topic: string;
  /** The edit this dive came from, shown in full above the conversation. */
  source?: SourceEdit | null;
  turns: DiveTurn[];
  sending: boolean;
  recharging: boolean;
  onSend: (text: string) => void;
}

export default function ChatPane({ topic, source = null, turns, sending, recharging, onSend }: ChatPaneProps) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  // Turns present at mount are history — they render instantly; only turns
  // that arrive live get the word-by-word reveal.
  const preloaded = useRef(turns.length);

  const scrollDown = () => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });

  useEffect(() => {
    scrollDown();
  }, [turns.length, sending]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setDraft('');
    onSend(trimmed);
  };

  const lastTurn = turns[turns.length - 1];
  const choices =
    !sending && !recharging && lastTurn?.role === 'orin'
      ? lastTurn.segments.find((s) => s.type === 'choices')
      : undefined;

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
          turn.segments
            .filter((s) => s.type === 'text')
            .map((s, j) => (
              <p
                key={`${i}-${j}`}
                className={`m-0 max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                  turn.role === 'student' ? 'ml-auto text-white' : ''
                }`}
                style={
                  turn.role === 'student'
                    ? { background: '#15151B', border: '1px solid var(--master-magenta-text)' }
                    : { background: 'var(--master-surface)', color: 'var(--master-text-secondary)' }
                }
              >
                {s.type !== 'text' ? '' : turn.role === 'orin' ? (
                  <OrinText text={s.text} animate={i >= preloaded.current} onGrow={scrollDown} />
                ) : (
                  s.text
                )}
              </p>
            )),
        )}

        {choices?.type === 'choices' && (
          <div className="flex flex-wrap gap-2">
            {choices.options.map((option) => (
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
        )}

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
          disabled={sending}
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
