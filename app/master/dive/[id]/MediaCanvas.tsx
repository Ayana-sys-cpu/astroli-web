'use client';
import type { Segment } from '@/lib/orin-dive';
import { VisualCard, MediaCard } from './SegmentCard';

/** Everything Orin has shown in this dive, newest first — the visual half of the split view. */
export default function MediaCanvas({ segments }: { segments: Segment[] }) {
  if (segments.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="text-[13px]" style={{ color: 'var(--master-text-muted)' }}>
          Visuals and photos Orin finds will appear here as you explore.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pr-1">
      {segments.map((segment, i) =>
        segment.type === 'visual' ? (
          <VisualCard key={i} segment={segment} />
        ) : segment.type === 'media' ? (
          <MediaCard key={i} segment={segment} />
        ) : null,
      )}
    </div>
  );
}
