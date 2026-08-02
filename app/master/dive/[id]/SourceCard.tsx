'use client';
import type { SourceEdit } from '@/lib/orin-dive';

/**
 * The edit this dive came from, in full — the same hook, story and bridge the
 * mobile feed shows behind "see more". The card only ever showed the headline,
 * so without this the student loses the piece they actually tapped on.
 */
export default function SourceCard({ source }: { source: SourceEdit }) {
  return (
    <article
      className="mb-1 rounded-xl px-3 py-3"
      style={{ background: 'var(--master-surface)', border: '1px solid var(--master-hairline)' }}
    >
      <p className="m-0 text-[13px] font-semibold leading-snug text-white">{source.hook}</p>

      <div className="my-2.5 h-px" style={{ background: 'var(--master-hairline)' }} />

      <p className="m-0 text-[13px] leading-relaxed" style={{ color: 'var(--master-text-secondary)' }}>
        {source.body}
      </p>

      {source.bridge && (
        <div className="mt-2.5 flex gap-2.5">
          <span className="w-[2px] shrink-0 rounded-full" style={{ background: 'var(--color-teal)' }} aria-hidden />
          <p className="m-0 text-[12.5px] leading-relaxed" style={{ color: 'var(--master-text-muted)' }}>
            {source.bridge}
          </p>
        </div>
      )}
    </article>
  );
}
