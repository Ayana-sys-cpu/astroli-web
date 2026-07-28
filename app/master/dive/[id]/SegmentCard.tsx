'use client';
import type { Segment } from '@/lib/orin-dive';

/**
 * Orin's visuals are model-authored HTML, so they render in a sandboxed iframe
 * with no network access and no access to the page around them.
 */
export function VisualCard({ segment }: { segment: Extract<Segment, { type: 'visual' }> }) {
  return (
    <figure
      className="m-0 overflow-hidden"
      style={{
        borderRadius: 12,
        background: 'var(--master-surface)',
        border: '1px solid var(--master-hairline)',
      }}
    >
      <iframe
        srcDoc={segment.html}
        title={segment.title}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        loading="lazy"
        className="block h-[340px] w-full border-0"
      />
      <figcaption className="px-3 py-2 text-[11px]" style={{ color: 'var(--master-text-secondary)' }}>
        {segment.title}
      </figcaption>
    </figure>
  );
}

export function MediaCard({ segment }: { segment: Extract<Segment, { type: 'media' }> }) {
  return (
    <figure
      className="m-0 overflow-hidden"
      style={{
        borderRadius: 12,
        background: 'var(--master-surface)',
        border: '1px solid var(--master-hairline)',
      }}
    >
      {segment.kind === 'video' ? (
        <video src={segment.url} controls playsInline className="block max-h-[340px] w-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={segment.url} alt={segment.title} loading="lazy" className="block max-h-[340px] w-full object-cover" />
      )}
      <figcaption className="px-3 py-2">
        <span className="block text-[12px] text-white">{segment.title}</span>
        <span className="block text-[10px]" style={{ color: 'var(--master-text-muted)' }}>
          {segment.credit}
        </span>
      </figcaption>
    </figure>
  );
}
