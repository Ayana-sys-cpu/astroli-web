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
      className="dive-media-arrive m-0 overflow-hidden"
      style={{
        borderRadius: 12,
        background: 'var(--master-surface)',
        border: '1px solid var(--master-hairline)',
      }}
    >
      <div className="overflow-hidden">
        {segment.kind === 'video' ? (
          <video src={segment.url} controls playsInline className="block max-h-[340px] w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={segment.url}
            alt={segment.title}
            loading="lazy"
            className="dive-media-kenburns block max-h-[340px] w-full object-cover"
          />
        )}
      </div>
      <figcaption className="px-3 py-2">
        <span className="block text-[12px] text-white">{segment.title}</span>
        <span className="block text-[10px]" style={{ color: 'var(--master-text-muted)' }}>
          {segment.credit}
        </span>
      </figcaption>

      {/* Images arrive like a documentary shot: slow fade-in plus a gentle drift. */}
      <style>{`
        .dive-media-arrive { animation: dive-media-fade 1.2s ease-out both; }
        @keyframes dive-media-fade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dive-media-kenburns { animation: dive-media-zoom 8s ease-out both; }
        @keyframes dive-media-zoom {
          from { transform: scale(1.08); }
          to { transform: scale(1); }
        }
      `}</style>
    </figure>
  );
}
