'use client';
import type { Segment } from '@/lib/orin-dive';

/** Bulleted facts inside the stream — Orin's list shape. */
export function ListBlock({ segment }: { segment: Extract<Segment, { type: 'list' }> }) {
  return (
    <div
      className="max-w-[85%] rounded-xl px-4 py-3"
      style={{ background: 'var(--master-surface)', border: '1px solid var(--master-hairline)' }}
    >
      {segment.title && (
        <p className="m-0 mb-1.5 text-[12px] font-semibold text-white" style={{ fontFamily: 'var(--font-space)' }}>
          {segment.title}
        </p>
      )}
      <ul className="m-0 list-none space-y-1.5 p-0">
        {segment.items.map((item) => (
          <li key={item} className="flex gap-2 text-[13px] leading-relaxed" style={{ color: 'var(--master-text-secondary)' }}>
            <span aria-hidden style={{ color: '#00F5D4' }}>◆</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A jaw-dropping stat or "did you know" rendered in its own spotlight box. */
export function CalloutBlock({ segment }: { segment: Extract<Segment, { type: 'callout' }> }) {
  return (
    <div
      className="max-w-[85%] rounded-xl px-4 py-3"
      style={{
        background: 'rgba(168,85,247,0.08)',
        border: '1px solid rgba(168,85,247,0.3)',
        borderLeft: '3px solid #A855F7',
      }}
    >
      {segment.label && (
        <p
          className="m-0 mb-1 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: '#A855F7' }}
        >
          {segment.label}
        </p>
      )}
      <p className="m-0 text-[14px] font-semibold leading-relaxed text-white">
        {segment.text}
      </p>
    </div>
  );
}

/** A small comparison table inside the stream — Orin's table shape. */
export function TableBlock({ segment }: { segment: Extract<Segment, { type: 'table' }> }) {
  return (
    <div
      className="max-w-[92%] overflow-x-auto rounded-xl px-4 py-3"
      style={{ background: 'var(--master-surface)', border: '1px solid var(--master-hairline)' }}
    >
      {segment.title && (
        <p className="m-0 mb-1.5 text-[12px] font-semibold text-white" style={{ fontFamily: 'var(--font-space)' }}>
          {segment.title}
        </p>
      )}
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {segment.headers.map((h) => (
              <th
                key={h}
                className="pb-1.5 pr-4 text-left font-semibold"
                style={{ color: '#A855F7', borderBottom: '1px solid var(--master-hairline)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {segment.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="py-1.5 pr-4 align-top"
                  style={{
                    color: j === 0 ? 'white' : 'var(--master-text-secondary)',
                    borderBottom: i < segment.rows.length - 1 ? '1px solid var(--master-hairline)' : 'none',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
