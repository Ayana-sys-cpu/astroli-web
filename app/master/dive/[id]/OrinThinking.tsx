'use client';
import { useEffect, useState } from 'react';

/**
 * Quiet Gemini-style waiting state: Orin's orb breathing gently beside one
 * softly-cycling status line. Deliberately understated — the reveal is the
 * show, not the wait.
 */
export default function OrinThinking({ topic }: { topic?: string }) {
  const lines = [
    topic ? `Exploring ${topic}…` : 'Thinking…',
    'Gathering the story…',
    'Finding a picture…',
  ];
  const [line, setLine] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLine((l) => (l + 1) % lines.length), 2600);
    return () => clearInterval(id);
  }, [lines.length]);

  return (
    <div className="flex items-center gap-2.5 py-1" aria-live="polite">
      <span className="orin-pulse inline-block h-4 w-4 shrink-0 rounded-full" aria-hidden />
      <span key={line} className="orin-line text-[12px]" style={{ color: 'var(--master-text-muted)' }}>
        {lines[line]}
      </span>

      <style>{`
        .orin-pulse {
          background: radial-gradient(circle at 35% 35%, #C060FF, #8B00FF);
          animation: orin-pulse 1.6s ease-in-out infinite;
        }
        @keyframes orin-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        .orin-line { animation: orin-line-fade 2.6s ease-in-out infinite; }
        @keyframes orin-line-fade {
          0%, 100% { opacity: 0.35; }
          20%, 75% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
