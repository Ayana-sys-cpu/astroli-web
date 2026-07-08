'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { createBrowserClient } from '@supabase/ssr';
import { saveStudent, saveAlienName, saveBaseAvatarUrl, markOnboardingComplete, clearSession } from '@/lib/student-store';

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

function setSessionIndicator() {
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  const domainAttr = domain ? `; domain=${domain}` : '';
  document.cookie = `astroli_session=1; path=/${domainAttr}; max-age=1209600; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
}

export default function AcceptInviteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token  = params.get('token');

  const [gisReady,  setGisReady]  = useState(false);
  // 'loading' — GIS not ready yet; 'ready' — show Sign in button; 'signing-in' — in progress; 'error'
  const [status,    setStatus]    = useState<'loading' | 'ready' | 'signing-in' | 'error'>('loading');
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null);
  const tokenClientRef = useRef<{ requestAccessToken: () => void } | null>(null);

  // Check for already-loaded GIS (e.g. cached from a prior page visit)
  useEffect(() => {
    if ((window as any).google?.accounts?.oauth2) setGisReady(true);
  }, []);

  useEffect(() => {
    if (!token) {
      setErrorMsg('Invalid invite link — no token found.');
      setStatus('error');
      return;
    }
    if (!gisReady) return;

    // Initialise the token client but do NOT call requestAccessToken() here.
    // Calling it from useEffect (not from a user gesture) causes browsers to
    // block the popup. We store it in a ref and trigger it from the button click.
    tokenClientRef.current = (window as any).google.accounts.oauth2.initTokenClient({
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

          // Establish Supabase session
          if (data.authToken) {
            await getBrowserClient().auth.verifyOtp({
              token_hash: data.authToken,
              type:       'email',
            });
          }

          setSessionIndicator();

          // Sync student identity into localStorage (mirrors the login page flow)
          if (data.isNewStudent) clearSession();
          saveStudent({
            firstName:     data.firstName,
            baseAvatarUrl: data.baseAvatarUrl ?? null,
            avatarUrl:     null,
          });
          if (data.alienName)     saveAlienName(data.alienName);
          if (data.baseAvatarUrl) saveBaseAvatarUrl(data.baseAvatarUrl);
          if (!data.isNewStudent) markOnboardingComplete();

          // New students get the full onboarding flow (avatar reveal → welcome → home)
          router.replace(data.isNewStudent ? '/onboarding/reveal' : '/syncing');
        } catch {
          setErrorMsg('Network error — please check your connection and try again.');
          setStatus('error');
        }
      },
    });

    setStatus('ready');
  }, [token, gisReady, router]);

  const handleSignIn = () => {
    if (!tokenClientRef.current) return;
    setStatus('signing-in');
    tokenClientRef.current.requestAccessToken();
  };

  const canRetry = status === 'error' && tokenClientRef.current !== null;

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
          {canRetry && (
            <button onClick={handleSignIn} className="btn-teal mt-2">
              Try again with Google
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGisReady(true)}
      />
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md space-y-4">
          {status === 'loading' && (
            <>
              <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin mx-auto" />
              <p className="text-muted-foreground">Loading…</p>
            </>
          )}
          {status === 'ready' && (
            <>
              <p className="text-muted-foreground">Your invite is ready.</p>
              <button onClick={handleSignIn} className="btn-teal">
                Continue with Google
              </button>
            </>
          )}
          {status === 'signing-in' && (
            <>
              <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin mx-auto" />
              <p className="text-muted-foreground">Signing you in…</p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
