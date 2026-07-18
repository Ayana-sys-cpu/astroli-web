// Shared chrome for the legal documents: the required "DRAFT — pending legal
// review" banner and the effective-date / version marker (single source of
// truth = lib/consent.ts). Used by both /legal/terms and /legal/privacy.

import Link from 'next/link';
import { CURRENT_POLICY_VERSION, POLICY_EFFECTIVE_DATE } from '@/lib/consent';

export default function LegalDoc({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="bg-grid min-h-screen px-6 py-12">
      <article className="mx-auto w-full max-w-2xl">
        {/* DRAFT banner — required on every published legal document (FR-013) */}
        <div
          className="rounded-xl p-4 mb-8"
          style={{ background: 'rgba(255,176,32,0.08)', border: '1px solid rgba(255,176,32,0.3)' }}
        >
          <p className="font-space text-sm font-bold" style={{ color: '#FFB020' }}>
            DRAFT — pending legal review before public launch
          </p>
          <p className="font-inter text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            This document is a plain-English draft and is not yet attorney-approved.
            It is provided so families can see how their data is handled during the pilot.
          </p>
        </div>

        <h1 className="font-space text-3xl font-bold text-white mb-1">{title}</h1>
        <p className="font-inter text-xs mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Version {CURRENT_POLICY_VERSION} · Effective {POLICY_EFFECTIVE_DATE}
        </p>

        <div className="legal-body font-inter space-y-5" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {children}
        </div>

        <div className="mt-12 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Link href="/legal/terms" className="underline underline-offset-2" style={{ color: '#00F5D4' }}>Terms of Use</Link>
            {'  ·  '}
            <Link href="/legal/privacy" className="underline underline-offset-2" style={{ color: '#00F5D4' }}>Privacy Policy</Link>
          </p>
        </div>
      </article>
    </main>
  );
}

// Small typographic helpers so the two documents read consistently.
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-space text-xl font-bold text-white mt-8 mb-2">{children}</h2>;
}
export function P({ children }: { children: React.ReactNode }) {
  return <p className="font-inter text-sm leading-relaxed">{children}</p>;
}
