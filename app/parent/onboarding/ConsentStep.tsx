'use client';

// Parental consent — Step 2 of 3 of parent onboarding, after the child's email
// is captured on Step 1. The email is displayed as text (never retyped here);
// two plain consent points (AI companion + data storage), links to the Terms of
// Use and Privacy Policy, and a deliberate affirmative action. The consent click
// is also what dispatches the invite: onSubmit records the consent AND sends the
// invite in one pass, so nothing ever reaches the child before consent exists.

import { useState } from 'react';
import { CONSENT_ITEM_LABELS, CONSENT_ITEMS, POLICY_EFFECTIVE_DATE } from '@/lib/consent-constants';

type Props = {
  childEmail: string;
  reconsent?: boolean;
  // False when the child is already linked or setup is complete — the click
  // then only records the consent, so the button must not promise an invite.
  willSendInvite: boolean;
  // Present only while the email is still changeable (child not linked yet).
  onChangeEmail?: () => void;
  // Records the consent and (normal path) sends the invite. Throws with a
  // user-facing message on failure — displayed under the checkbox.
  onSubmit: () => Promise<void>;
};

export default function ConsentStep({ childEmail, reconsent, willSendInvite, onChangeEmail, onSubmit }: Props) {
  const [agreed, setAgreed]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const disabled = !agreed || !childEmail || loading;

  async function handleConsent(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="font-space text-[9px] font-bold uppercase text-[#00F5D4]" style={{ letterSpacing: '0.22em' }}>
          {reconsent ? 'Please review' : 'Step 2 of 3'}
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

      {/* The consent subject — displayed, never retyped. Captured on Step 1. */}
      <div
        className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="min-w-0">
          <p
            className="font-space text-[10px] font-bold uppercase"
            style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em' }}
          >
            You&apos;re consenting for
          </p>
          <p className="font-inter text-sm text-white truncate">{childEmail}</p>
        </div>
        {onChangeEmail && (
          <button
            type="button"
            onClick={onChangeEmail}
            className="font-inter text-xs underline underline-offset-2 flex-shrink-0"
            style={{ color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Change
          </button>
        )}
      </div>

      {/* The two plain consent points — informational list, deliberately not
          styled like controls (the checkbox below is the only interactive bit) */}
      <ul className="space-y-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {CONSENT_ITEMS.map(item => (
          <li
            key={item}
            className="flex items-start gap-3 rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <svg
              className="mt-0.5 flex-shrink-0"
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              aria-hidden="true"
            >
              <path d="M3 8.5L6.5 12L13 4.5" stroke="#00F5D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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
          disabled={disabled}
          className="btn-teal"
          style={disabled ? {
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.35)',
            boxShadow: 'none',
            cursor: 'default',
          } : undefined}
        >
          {loading
            ? (willSendInvite ? 'Sending invite…' : 'Recording…')
            : willSendInvite
              ? 'I consent — send invite →'
              : (reconsent ? 'I agree — continue →' : 'I consent — continue →')}
        </button>
      </form>
    </div>
  );
}
