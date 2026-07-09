'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AcceptInviteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token  = params.get('token');
  const ranRef = useRef(false);

  const [status,   setStatus]   = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (!token) {
      setErrorMsg('Invalid invite link — no token found.');
      setStatus('error');
      return;
    }

    async function bootstrap() {
      // New Resend-based flow: this page IS the invite link entry point.
      // No session exists yet. We call create-invite-session to generate a
      // Supabase magic-link on demand, then redirect the browser to it.
      // The action_link is generated at click time (not at send time), so
      // resends don't invalidate anything, and email scanners can't consume
      // it (they don't run JS).
      try {
        const res  = await fetch('/api/auth/create-invite-session', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 409) {
          // Already accepted — jump straight to home.
          router.replace('/syncing');
          return;
        }

        if (!res.ok) {
          setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
          setStatus('error');
          return;
        }

        // Redirect to Supabase's action_link → Supabase verifies → redirects
        // back to /auth/callback?invite=TOKEN#access_token=… → CallbackContent
        // sets the session and calls /api/auth/accept-invite to finish.
        window.location.href = data.actionLink;
      } catch {
        setErrorMsg('Network error — please check your connection and try again.');
        setStatus('error');
      }
    }

    bootstrap();
  }, [token, router]);

  if (status === 'error') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-xl font-semibold">Invite Error</h1>
          <p className="text-muted-foreground">{errorMsg}</p>
          {(errorMsg?.includes('expired') || errorMsg?.includes('invite link')) && (
            <p className="text-sm text-muted-foreground">
              Ask your parent to send a new invite from their dashboard.
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md space-y-4">
        <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin mx-auto" />
        <p className="text-muted-foreground">Joining Astroli…</p>
      </div>
    </main>
  );
}
