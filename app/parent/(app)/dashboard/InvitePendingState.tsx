'use client';

import { useState } from 'react';

type PendingInvite = { childEmail: string; createdAt: string; expiresAt: string };

// "2 hours ago" / "3 days ago" — coarse is fine, this is ambient context.
function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function expiresIn(iso: string): string | null {
  const hours = Math.floor((new Date(iso).getTime() - Date.now()) / 3600000);
  if (hours <= 0) return null;
  if (hours < 24) return `expires in ${hours} hour${hours === 1 ? '' : 's'}`;
  return `expires in ${Math.floor(hours / 24)} day${Math.floor(hours / 24) === 1 ? '' : 's'}`;
}

export default function InvitePendingState({
  childName,
  pendingInvite,
}: {
  childName: string | null;
  pendingInvite: PendingInvite | null;
}) {
  const [resending, setResending] = useState(false);
  const [feedback, setFeedback]   = useState<{ kind: 'ok' | 'error'; message: string } | null>(null);

  const displayName = childName ?? 'your child';
  const expiry      = pendingInvite ? expiresIn(pendingInvite.expiresAt) : null;
  const isExpired   = pendingInvite != null && expiry === null;

  async function handleResend() {
    setResending(true);
    setFeedback(null);
    try {
      const res  = await fetch('/api/parent/child-invite/resend', { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setFeedback({ kind: 'ok', message: 'Invite sent. Ask them to check their inbox.' });
      } else {
        setFeedback({
          kind: 'error',
          message: data.error ?? 'Could not resend right now. Try again in a moment.',
        });
      }
    } catch {
      setFeedback({ kind: 'error', message: 'Network error — check your connection and try again.' });
    } finally {
      setResending(false);
    }
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 32px', gap: 14,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'rgba(139,0,255,0.08)', border: '1px solid rgba(139,0,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B00FF" strokeWidth="1.8">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px' }}>
          Waiting for {displayName} to accept the invite
        </p>
        <p style={{ fontSize: 13, color: 'rgba(26,26,46,0.5)', margin: 0, maxWidth: 340 }}>
          Once they click the link and sign in, their progress shows up here.
        </p>
      </div>

      {pendingInvite && (
        <div style={{
          width: '100%', maxWidth: 400,
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(26,26,46,0.1)',
          borderRadius: 10, padding: '10px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,46,0.35)" strokeWidth="1.8" style={{ flexShrink: 0 }}>
              <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
            </svg>
            <span style={{
              fontSize: 13, color: 'rgba(26,26,46,0.65)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {pendingInvite.childEmail}
            </span>
          </div>
          <button
            onClick={handleResend}
            disabled={resending}
            style={{
              flexShrink: 0, fontSize: 12, fontWeight: 600, padding: '5px 12px',
              borderRadius: 6, cursor: resending ? 'default' : 'pointer',
              border: '1px solid rgba(139,0,255,0.3)',
              background: 'rgba(139,0,255,0.06)', color: '#8B00FF',
              opacity: resending ? 0.5 : 1,
            }}
          >
            {resending ? 'Sending…' : 'Resend'}
          </button>
        </div>
      )}

      {pendingInvite && (
        <p style={{ fontSize: 12, color: isExpired ? '#C2410C' : 'rgba(26,26,46,0.4)', margin: 0 }}>
          {isExpired
            ? 'This link has expired — resend to send a fresh one.'
            : `Sent ${timeAgo(pendingInvite.createdAt)} · ${expiry}`}
        </p>
      )}

      {feedback && (
        <p style={{
          fontSize: 12, margin: 0,
          color: feedback.kind === 'ok' ? '#0F6E56' : '#C2410C',
        }}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}
