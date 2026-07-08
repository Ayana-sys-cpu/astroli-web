'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const domain    = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  const domainAttr = domain ? `; domain=${domain}` : '';
  document.cookie = `astroli_session=1; path=/${domainAttr}; max-age=1209600; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
}

export default function AcceptInviteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token  = params.get('token');

  const [status,   setStatus]   = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMsg('Invalid invite link — no token found.');
      setStatus('error');
      return;
    }

    async function accept() {
      // The session was established in /auth/callback via setSession(). On a
      // cross-site email-link navigation the auth cookie can lag a moment behind
      // this page's freshly-created client, so poll getSession briefly rather
      // than hard-failing on the first null (the old cause of "no session"
      // errors). We proceed to the API even if it stays null — the server
      // verifies the Bearer token / cookie and is the source of truth.
      let session = null;
      for (let i = 0; i < 12; i++) {
        session = (await getBrowserClient().auth.getSession()).data.session;
        if (session) break;
        await new Promise(r => setTimeout(r, 250));
      }

      try {
        const res = await fetch('/api/auth/accept-invite', {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            // Pass the access token explicitly so acceptance never depends on
            // the cookie having propagated across the navigation (race-proof).
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body:    JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.status === 409) {
          // Invite already accepted — account exists, proceed as returning student.
          markOnboardingComplete();
          router.replace('/syncing');
          return;
        }

        if (!res.ok) {
          setErrorMsg(data.error ?? 'Something went wrong.');
          setStatus('error');
          return;
        }

        setSessionIndicator();

        if (data.isNewStudent) clearSession();
        saveStudent({
          firstName:     data.firstName,
          baseAvatarUrl: data.baseAvatarUrl ?? null,
          avatarUrl:     null,
        });
        if (data.alienName)     saveAlienName(data.alienName);
        if (data.baseAvatarUrl) saveBaseAvatarUrl(data.baseAvatarUrl);
        if (!data.isNewStudent) markOnboardingComplete();

        router.replace(data.isNewStudent ? '/onboarding/reveal' : '/syncing');
      } catch {
        setErrorMsg('Network error — please check your connection and try again.');
        setStatus('error');
      }
    }

    accept();
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
