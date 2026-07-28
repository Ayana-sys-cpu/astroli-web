'use client';
import { useEffect, useRef, useState } from 'react';
import type { DiveTurn } from '@/lib/orin-dive';

interface ChatPaneProps {
  topic: string;
  turns: DiveTurn[];
  sending: boolean;
  recharging: boolean;
  onSend: (text: string) => void;
}

export default function ChatPane({ topic, turns, sending, recharging, onSend }: ChatPaneProps) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length, sending]);

  const send = () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    onSend(text);
  };

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
                {s.type === 'text' ? s.text : ''}
              </p>
            )),
        )}

        {sending && (
          <p className="m-0 text-[12px]" style={{ color: 'var(--master-text-muted)' }}>
            Orin is thinking…
          </p>
        )}

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
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask anything…"
          aria-label="Ask Orin about this topic"
          disabled={sending}
          maxLength={1000}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none"
        />
        <button
          type="button"
          onClick={send}
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
