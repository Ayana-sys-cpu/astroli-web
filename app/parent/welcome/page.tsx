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
    screenshot: '/marketing/landscape-planets.png',
    objectPosition: 'left top',
  },
  {
    eyebrow: 'Guide',
    headline: 'An AI guide, just for them',
    copy: 'Each planet has an AI companion that adapts to how your child thinks — asking questions, encouraging, never just handing over the answer.',
    screenshot: '/marketing/landscape-pip.png',
    objectPosition: 'center top',
  },
  {
    eyebrow: 'Track',
    headline: 'You stay in the loop',
    copy: 'You choose the journey. Your child works independently at their own pace. Your dashboard shows their progress as it happens.',
    screenshot: '/marketing/teacher-cropped.png',
    objectPosition: 'center top',
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

  const { eyebrow, headline, copy, screenshot, objectPosition } = SLIDES[slide];
  // After sign-in a parent with no child is already authenticated — send them
  // directly to onboarding rather than back to the sign-in page.
  const ctaDestination = loggedIn ? '/parent/onboarding' : '/';

  return (
    <main className="bg-grid min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Split Panel Card */}
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl flex min-h-[380px] relative"
        style={{
          background: '#080808',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Gradient top stripe — magenta → purple → teal, matches app's glass-panel */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10"
          style={{ background: 'linear-gradient(90deg, #FF0080, #8B00FF, #00F5D4)', opacity: 0.7 }}
        />

        {/* Left — text */}
        <div className="flex flex-1 flex-col justify-between gap-8 p-10">
          <div className="space-y-3">
            <p
              className="font-space text-[9px] font-bold uppercase"
              style={{ color: '#00F5D4', letterSpacing: '0.22em' }}
            >
              {eyebrow}
            </p>
            <h1 className="font-space text-2xl font-bold leading-snug text-white">{headline}</h1>
            <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{copy}</p>
          </div>

          {/* Footer: dots + nav */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className="transition-all duration-200"
                  style={{
                    height: '6px',
                    width: i === slide ? '20px' : '6px',
                    borderRadius: '9999px',
                    background: i === slide ? '#00F5D4' : 'rgba(255,255,255,0.15)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              {slide === 0 ? (
                <button
                  onClick={() => router.push(ctaDestination)}
                  className="font-inter text-xs underline underline-offset-4 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Skip
                </button>
              ) : (
                <button
                  onClick={() => setSlide(slide - 1)}
                  className="font-inter text-xs underline underline-offset-4 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ← Back
                </button>
              )}

              {slide < SLIDES.length - 1 ? (
                <button
                  onClick={() => setSlide(slide + 1)}
                  className="btn-teal font-space"
                  style={{ width: 'auto', padding: '9px 20px', fontSize: '11px', letterSpacing: '0.1em' }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => router.push(ctaDestination)}
                  className="btn-teal font-space"
                  style={{ width: 'auto', padding: '9px 20px', fontSize: '11px', letterSpacing: '0.1em' }}
                >
                  Set it up free →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right — screenshot */}
        <div
          className="relative w-96 flex-shrink-0 overflow-hidden"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={screenshot}
            src={screenshot}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition }}
          />
          {/* Subtle left-side fade so screenshot blends into card */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-8"
            style={{ background: 'linear-gradient(to right, #080808, transparent)' }}
          />
          <div className="pointer-events-none absolute inset-0 rounded-r-2xl ring-1 ring-inset ring-white/5" />
        </div>
      </div>
    </main>
  );
}
