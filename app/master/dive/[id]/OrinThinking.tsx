'use client';
import { useEffect, useState } from 'react';

/**
 * The waiting state, made worth watching: a breathing orb with drifting
 * particles and rotating teaser lines, instead of a dead "thinking…" label.
 */
export default function OrinThinking({ topic }: { topic?: string }) {
  const lines = [
    topic ? `Tuning into ${topic}…` : 'Tuning the signal…',
    'Scanning the archives…',
    'Following the trail…',
    'Pulling up the good stuff…',
  ];
  const [line, setLine] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLine((l) => (l + 1) % lines.length), 2200);
    return () => clearInterval(id);
  }, [lines.length]);

  return (
    <div className="flex items-center gap-3 py-1" aria-live="polite">
      <span className="orin-orb relative inline-block h-7 w-7 shrink-0 rounded-full" aria-hidden>
        <span className="orin-spark orin-spark-1" />
        <span className="orin-spark orin-spark-2" />
        <span className="orin-spark orin-spark-3" />
      </span>
      <span key={line} className="orin-teaser text-[12px]" style={{ color: 'var(--master-text-muted)' }}>
        {lines[line]}
      </span>

      <style>{`
        .orin-orb {
          background: radial-gradient(circle at 35% 35%, #C060FF, #8B00FF);
          animation: orin-breathe 1.8s ease-in-out infinite;
        }
        @keyframes orin-breathe {
          0%, 100% { transform: scale(1); box-shadow: 0 0 8px 2px rgba(168, 85, 247, 0.35); }
          50% { transform: scale(1.12); box-shadow: 0 0 18px 6px rgba(168, 85, 247, 0.55); }
        }
        .orin-spark {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 3px;
          height: 3px;
          border-radius: 9999px;
          background: #00F5D4;
          animation: orin-orbit 2.6s linear infinite;
        }
        .orin-spark-2 { background: #FF3D9A; animation-delay: -0.9s; animation-duration: 3.1s; }
        .orin-spark-3 { background: #FFFFFF; animation-delay: -1.7s; animation-duration: 3.6s; }
        @keyframes orin-orbit {
          from { transform: rotate(0deg) translateX(16px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(16px) rotate(-360deg); }
        }
        .orin-teaser { animation: orin-fade 2.2s ease-in-out infinite; }
        @keyframes orin-fade {
          0% { opacity: 0; }
          15%, 80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
