'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;
function getBrowserClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _client;
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [status, setStatus] = useState<'loading' | 'signing-in' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMsg('Invalid invite link — no token found.');
      setStatus('error');
      return;
    }

    setStatus('signing-in');

    // Trigger Google OAuth — on return, exchange the code + token
    const client = (window as any).google?.accounts?.oauth2;
    if (!client) {
      setErrorMsg('Google sign-in did not load. Please refresh and try again.');
      setStatus('error');
      return;
    }

    const tokenClient = client.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      scope:     'email profile',
      callback:  async (resp: { access_token?: string; error?: string }) => {
        if (resp.error || !resp.access_token) {
          setErrorMsg("Couldn't sign in with Google. Please try again.");
          setStatus('error');
          return;
        }

        try {
          const res = await fetch('/api/auth/accept-invite', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ token, accessToken: resp.access_token }),
          });

          const data = await res.json();

          if (!res.ok) {
            setErrorMsg(data.error ?? 'Something went wrong.');
            setStatus('error');
            return;
          }

          // Establish Supabase session then navigate to student home
          if (data.authToken) {
            await getBrowserClient().auth.verifyOtp({
              token_hash: data.authToken,
              type:       'email',
            });
          }

          router.replace('/home');
        } catch {
          setErrorMsg('Network error — please check your connection and try again.');
          setStatus('error');
        }
      },
    });

    tokenClient.requestAccessToken();
  }, [token, router]);

  if (status === 'error') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-xl font-semibold">Invite Error</h1>
          <p className="text-muted-foreground">{errorMsg}</p>
          {errorMsg?.includes('expired') && (
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
        <p className="text-muted-foreground">
          {status === 'loading' ? 'Loading…' : 'Signing you in…'}
        </p>
      </div>
    </main>
  );
}
