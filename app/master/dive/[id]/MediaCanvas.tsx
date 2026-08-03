'use client';
import type { Segment } from '@/lib/orin-dive';
import { VisualCard } from './SegmentCard';

/**
 * The on-demand canvas: appears beside the chat only while an interactive
 * visual is open, then slides away. Photos and tables live in the stream
 * itself — this panel exists for the things a chat bubble can't hold.
 */
export default function MediaCanvas({
  visual,
  onClose,
}: {
  visual: Extract<Segment, { type: 'visual' }>;
  onClose: () => void;
}) {
  return (
    <div className="canvas-slide flex min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px]" style={{ color: 'var(--master-text-muted)' }}>
          {visual.title}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the interactive"
          className="rounded-full border px-3 py-1 text-[12px] text-white transition-colors hover:bg-white/10"
          style={{ borderColor: 'var(--master-hairline)' }}
        >
          Close ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <VisualCard segment={visual} />
      </div>

      <style>{`
        .canvas-slide { animation: canvas-in 0.35s ease-out both; }
        @keyframes canvas-in {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
