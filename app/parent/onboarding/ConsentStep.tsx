'use client';

import { useState } from 'react';
import { POLICY_EFFECTIVE_DATE } from '@/lib/consent-constants';

type Props = {
  childEmail: string;
  reconsent?: boolean;
  willSendInvite: boolean;
  onChangeEmail?: () => void;
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
    <div className="p-8 space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <p className="font-space text-[9px] font-bold uppercase text-[#00F5D4]" style={{ letterSpacing: '0.22em' }}>
          {reconsent ? 'Please review' : 'Step 2 of 3'}
        </p>
        <h1 className="font-space text-2xl font-bold text-white">
          {reconsent ? 'We updated our terms' : 'Almost there'}
        </h1>
      </div>

      {/* Single-paragraph summary — email + what's included + doc links */}
      <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {reconsent
          ? <>Please review the updated terms so <span style={{ color: 'rgba(255,255,255,0.88)' }}>{childEmail}</span> can keep learning with Orin (AI guide) and have their progress saved.{' '}</>
          : <>By sending this invite you agree that{' '}<span style={{ color: 'rgba(255,255,255,0.88)' }}>{childEmail}</span>{' '}can use Orin (AI guide) and have their conversations and progress saved.{' '}</>
        }
        <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#00F5D4', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
          Terms
        </a>
        {' · '}
        <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#00F5D4', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
          Privacy
        </a>
        <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '11px' }}> · drafts pending legal review · {POLICY_EFFECTIVE_DATE}</span>
      </p>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

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
            {reconsent
              ? "I've read and agree to the updated terms"
              : "I'm their parent or guardian — I consent"}
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
              ? 'Send invite →'
              : (reconsent ? 'I agree — continue →' : 'Continue →')}
        </button>

        {onChangeEmail && (
          <p className="text-center">
            <button
              type="button"
              onClick={onChangeEmail}
              className="font-inter text-xs underline underline-offset-2"
              style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Change email
            </button>
          </p>
        )}
      </form>
    </div>
  );
}
