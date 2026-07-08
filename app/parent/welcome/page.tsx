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
    eyebrow: 'Explore',
    headline: 'Multiple planets, one big idea',
    copy: 'Your child picks a learning mission and explores it across interactive planets — each one a different angle on the same idea.',
    screenshot: '/marketing/landscape.png',
  },
  {
    eyebrow: 'Guide',
    headline: 'An AI guide, just for them',
    copy: 'Each planet has an AI companion that adapts to how your child thinks — asking questions, encouraging, never just handing over the answer.',
    screenshot: '/marketing/landscape.png',
  },
  {
    eyebrow: 'Track',
    headline: 'You stay in the loop',
    copy: 'You choose the journey. Your child works independently at their own pace. Your dashboard shows their progress as it happens.',
    screenshot: '/marketing/teacher.png',
  },
];

export default function ParentWelcomePage() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data: { session } }: { data: { session: import('@supabase/supabase-js').Session | null } }) => {
        if (cancelled) return;
        if (session?.user.user_metadata?.role === 'parent') {
          // has_child is written into user_metadata at login time — no DB call needed.
          // Returning parents who already set up a child go straight to dashboard.
          if (session.user.user_metadata?.has_child === true) {
            router.replace('/parent/dashboard');
            return;
          }
          setLoggedIn(true);
        }
        setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => { cancelled = true; };
  }, [router]);

  if (checking) return null;

  const { eyebrow, headline, copy, screenshot } = SLIDES[slide];
  // After sign-in a parent with no child is already authenticated — send them
  // directly to onboarding rather than back to the sign-in page.
  const ctaDestination = loggedIn ? '/parent/onboarding' : '/';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Split Panel Card */}
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/8 bg-card shadow-2xl flex min-h-[360px]">
        {/* Left — text */}
        <div className="flex flex-1 flex-col justify-between gap-8 p-10">
          <div className="space-y-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-primary">{eyebrow}</p>
            <h1 className="text-2xl font-bold leading-snug">{headline}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{copy}</p>
          </div>

          {/* Footer: dots + nav */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className={
                    i === slide
                      ? 'h-1.5 w-5 rounded-full bg-primary transition-all'
                      : 'h-1.5 w-1.5 rounded-full bg-muted-foreground/25 transition-all'
                  }
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              {slide === 0 ? (
                <button
                  onClick={() => router.push(ctaDestination)}
                  className="text-xs text-muted-foreground underline underline-offset-4"
                >
                  Skip
                </button>
              ) : (
                <button
                  onClick={() => setSlide(slide - 1)}
                  className="text-xs text-muted-foreground underline underline-offset-4"
                >
                  ← Back
                </button>
              )}

              {slide < SLIDES.length - 1 ? (
                <button
                  onClick={() => setSlide(slide + 1)}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => router.push(ctaDestination)}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                >
                  Set it up free →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right — screenshot */}
        <div className="relative w-72 flex-shrink-0 overflow-hidden border-l border-white/8 bg-muted/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={screenshot}
            src={screenshot}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
          <div className="pointer-events-none absolute inset-0 rounded-r-2xl ring-1 ring-inset ring-white/10" />
        </div>
      </div>
    </main>
  );
}
