'use client';

// Parental consent step — the FIRST step of parent onboarding, shown before the
// child invite. Two plain consent points (AI companion + data storage), links to
// the Terms of Use and Privacy Policy, and a deliberate affirmative action. No
// voice line until the voice feature ships (FR-002). On success it POSTs an
// append-only consent record and calls onConsented() to advance to the invite.

import { useState } from 'react';
import { CONSENT_ITEM_LABELS, CONSENT_ITEMS, POLICY_EFFECTIVE_DATE } from '@/lib/consent';

type Props = {
  childEmail: string;
  setChildEmail: (v: string) => void;
  onConsented: () => void;
  reconsent?: boolean;
};

export default function ConsentStep({ childEmail, setChildEmail, onConsented, reconsent }: Props) {
  const [agreed, setAgreed]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleConsent(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    setLoading(true);
    setError(null);

    const res = await fetch('/api/parent/consent', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ childEmail, items: CONSENT_ITEMS }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    onConsented();
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="font-space text-[9px] font-bold uppercase text-[#00F5D4]" style={{ letterSpacing: '0.22em' }}>
          {reconsent ? 'Please review' : 'Before you begin'}
        </p>
        <h1 className="font-space text-2xl font-bold text-white">
          {reconsent ? 'We updated our terms' : 'Your consent, as their parent'}
        </h1>
        <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {reconsent
            ? 'Please review and confirm the updated terms so your child can keep learning.'
            : "You're setting up an AI learning space for your child. Here's exactly what that involves — please confirm you're okay with it."}
        </p>
      </div>

      {/* Child email — the consent subject. Captured here so the record ties to
          this child before the invite exists. */}
      <div className="space-y-1.5">
        <label
          className="font-space text-[10px] font-bold uppercase"
          style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em' }}
          htmlFor="consentChildEmail"
        >
          Child&apos;s Gmail
        </label>
        <input
          id="consentChildEmail"
          type="email"
          required
          value={childEmail}
          onChange={e => setChildEmail(e.target.value)}
          placeholder="child@gmail.com"
          className="input-dark"
        />
      </div>

      {/* The two plain consent points */}
      <ul className="space-y-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {CONSENT_ITEMS.map(item => (
          <li
            key={item}
            className="flex items-start gap-3 rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <span
              className="mt-0.5 flex-shrink-0 flex items-center justify-center rounded-full"
              style={{ width: 16, height: 16, background: '#00F5D4' }}
              aria-hidden="true"
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#000' }} />
            </span>
            <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {CONSENT_ITEM_LABELS[item]}
            </p>
          </li>
        ))}
      </ul>

      {/* Doc links */}
      <p className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Read the full{' '}
        <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: '#00F5D4' }}>
          Terms of Use
        </a>{' '}
        and{' '}
        <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: '#00F5D4' }}>
          Privacy Policy
        </a>
        . These are drafts pending legal review · {POLICY_EFFECTIVE_DATE}.
      </p>

      <form onSubmit={handleConsent} className="space-y-4">
        {/* Deliberate affirmative action */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-1 flex-shrink-0"
            style={{ accentColor: '#00F5D4', width: 16, height: 16 }}
          />
          <span className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
            I am this child&apos;s parent or legal guardian, and I consent to the above on their behalf.
          </span>
        </label>

        {error && <p className="font-inter text-sm" style={{ color: '#FF0080' }}>{error}</p>}

        <button
          type="submit"
          disabled={!agreed || !childEmail || loading}
          className="btn-teal"
          style={{ opacity: (!agreed || !childEmail || loading) ? 0.4 : 1 }}
        >
          {loading ? 'Recording…' : 'I consent — continue →'}
        </button>
      </form>
    </div>
  );
}
