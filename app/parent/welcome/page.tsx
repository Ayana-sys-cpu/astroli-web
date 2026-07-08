'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;
function getSupabaseBrowserClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _client;
}

const SLIDES = [
  {
    headline: '5 planets, one big idea',
    copy: 'Your child picks a learning mission and explores it across 5 interactive planets — each one a different angle on the same idea.',
  },
  {
    headline: 'An AI guide, just for them',
    copy: 'Each planet has an AI companion that adapts to how your child thinks — asking questions, encouraging, never just handing over the answer.',
  },
  {
    headline: 'You stay in the loop',
    copy: 'You choose the journey. Your child works independently at their own pace. Your dashboard shows their progress as it happens.',
  },
];

export default function ParentWelcomePage() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data: { session } }: { data: { session: import('@supabase/supabase-js').Session | null } }) => {
        if (cancelled) return;
        if (session?.user.user_metadata?.role === 'parent') {
          router.replace('/parent/dashboard');
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => { cancelled = true; };
  }, [router]);

  if (checking) return null;

  const { headline, copy } = SLIDES[slide];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">{headline}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{copy}</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className={
                i === slide
                  ? 'h-1.5 w-4 rounded-full bg-primary transition-all'
                  : 'h-1.5 w-1.5 rounded-full bg-muted-foreground/30 transition-all'
              }
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          {slide === 0 ? (
            <button
              onClick={() => router.push('/')}
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              Skip
            </button>
          ) : (
            <button
              onClick={() => setSlide(slide - 1)}
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              ← Back
            </button>
          )}

          {slide < 2 ? (
            <button
              onClick={() => setSlide(slide + 1)}
              className="rounded-md border px-4 py-2 text-sm font-medium"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => router.push('/')}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Set it up for free →
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
