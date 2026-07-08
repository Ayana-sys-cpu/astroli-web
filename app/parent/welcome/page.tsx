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
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* App Preview Card */}
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/8 bg-card shadow-2xl">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 border-b border-white/8 bg-muted/40 px-3.5 py-2.5">
          <span className="h-2 w-2 rounded-full bg-red-400/70" />
          <span className="h-2 w-2 rounded-full bg-yellow-400/70" />
          <span className="h-2 w-2 rounded-full bg-green-400/70" />
          <span className="ml-2 flex-1 rounded bg-white/5 px-2 py-0.5 text-center text-[10px] text-muted-foreground">
            app.astroli.ai
          </span>
        </div>

        {/* Screenshot */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={screenshot}
          src={screenshot}
          alt=""
          className="block h-48 w-full object-cover object-top"
        />

        {/* Text body */}
        <div className="space-y-1.5 px-5 pb-5 pt-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-primary">{eyebrow}</p>
          <h1 className="text-xl font-bold leading-tight">{headline}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{copy}</p>
        </div>

        {/* Footer: dots + nav */}
        <div className="flex items-center justify-between px-5 pb-5">
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
    </main>
  );
}
