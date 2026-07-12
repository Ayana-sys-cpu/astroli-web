'use client';

import { useState } from 'react';
import type { MissionTerm } from '@/lib/orin-guide-types';

const T = {
  tp: '#e2e8f0',
  ts: '#8896a8',
  tm: '#5c6f85',
} as const;

export function TermRow({ term }: { term: MissionTerm }) {
  const [open, setOpen] = useState(false);
  const hasDefinition = term.definition.trim().length > 0;

  return (
    <div
      style={{
        borderRadius: 8, overflow: 'hidden',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <button
        onClick={() => hasDefinition && setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 8,
          padding: '8px 12px', background: 'none', border: 'none',
          cursor: hasDefinition ? 'pointer' : 'default', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: T.tp }}>{term.label}</span>
        {hasDefinition && (
          <span style={{
            fontSize: 10, color: T.tm, flexShrink: 0,
            display: 'inline-block',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.15s',
          }}>▾</span>
        )}
      </button>
      {open && hasDefinition && (
        <div style={{ padding: '0 12px 10px', fontSize: 11, color: T.ts, lineHeight: 1.6 }}>
          {term.definition}
        </div>
      )}
    </div>
  );
}
