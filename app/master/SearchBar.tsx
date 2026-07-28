'use client';
import { useEffect, useState } from 'react';

/** Real questions, not "search…" — students see what a good ask looks like. */
const EXAMPLES = [
  'How does a volcano actually work?',
  'Why do black holes bend light?',
  'What lives at the bottom of the ocean?',
  'How did people build the pyramids?',
  'Why do we dream?',
];
const ROTATE_MS = 4000;

interface SearchBarProps {
  onSubmit: (topic: string) => void;
  busy?: boolean;
}

export default function SearchBar({ onSubmit, busy = false }: SearchBarProps) {
  const [value, setValue] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    if (value) return;
    const timer = setInterval(() => {
      setExampleIndex((i) => (i + 1) % EXAMPLES.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [value]);

  const submit = () => {
    const topic = value.trim();
    if (!topic || busy) return;
    onSubmit(topic);
  };

  return (
    <div className="mx-auto mb-3 flex max-w-lg items-center gap-2 rounded-full px-5 py-3"
      style={{
        background: 'var(--master-surface)',
        border: '1px solid var(--master-hairline)',
        boxShadow: '0 0 18px rgba(0, 245, 212, 0.15)',
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={`Try: “${EXAMPLES[exampleIndex]}”`}
        aria-label="Ask anything you are curious about"
        disabled={busy}
        maxLength={300}
        className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[13px]"
        style={{ ['--tw-placeholder-opacity' as string]: 1, color: '#fff' }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        aria-label="Start exploring"
        className="shrink-0 text-[16px] leading-none transition-opacity disabled:opacity-40"
        style={{ color: 'var(--master-magenta-text)' }}
      >
        {busy ? '…' : '➤'}
      </button>
    </div>
  );
}
