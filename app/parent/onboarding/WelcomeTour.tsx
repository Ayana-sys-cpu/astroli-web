'use client';

// 3-slide app preview tour (Explore / Guide / Track) shown as the intro of
// parent onboarding for brand-new parents. Lived at /parent/welcome until the
// July 2026 login-routing fix sent every parent straight to the dashboard and
// orphaned that page — it now renders inside the onboarding flow itself so no
// routing change can strand it again. Skippable; onDone advances to Step 1.

import { useState } from 'react';

const SLIDES = [
  {
    eyebrow: 'Explore',
    headline: 'Multiple planets, one big idea',
    copy: 'Your child picks a learning mission and explores it across interactive planets — each one a different angle on the same idea.',
  },
  {
    eyebrow: 'Guide',
    headline: 'An AI guide, just for them',
    copy: 'Each planet has an AI companion that adapts to how your child thinks — asking questions, encouraging, never just handing over the answer.',
  },
  {
    eyebrow: 'Track',
    headline: 'You stay in the loop',
    copy: 'You choose the journey. Your child works independently at their own pace. Your dashboard shows their progress as it happens.',
  },
];

function ExplorePanel() {
  return (
    <div className="bg-black/40 border-l border-gray-800 flex items-center justify-center p-4 h-full">
      <div className="relative w-full h-full min-h-[300px] rounded-lg overflow-hidden border border-gray-800/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/marketing/landscape-planets.png"
          alt="Learning Mission UI Preview"
          className="absolute inset-0 w-full h-full object-cover object-left-top"
          style={{ filter: 'brightness(0.9)' }}
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 to-transparent" />
      </div>
    </div>
  );
}

function GuidePanel() {
  return (
    <div className="flex flex-col h-full bg-[#080808] border-l border-white/5">
      {/* Top bar */}
      <div className="flex items-center justify-end p-4 gap-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center bg-[#2d00ff]/20 px-3 py-1.5 rounded-full border border-purple-700/30">
          <svg className="w-4 h-4 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 100-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
          </svg>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Store · 330</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Demo S.</span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ border: '1px solid rgba(0,255,209,0.5)', color: '#00ffd1' }}
          >
            D
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden min-h-0">
        {/* Chat header */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ffd1] to-blue-500"
              style={{ boxShadow: '0 0 15px rgba(0,255,209,0.4)' }}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-widest uppercase">Orin</span>
              <span className="text-[10px] font-bold" style={{ color: '#00ffd1' }}>• GUIDE</span>
            </div>
          </div>
          <button className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        {/* Chat message */}
        <div className="flex gap-4 flex-shrink-0">
          <div
            className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-[#00ffd1] to-blue-400"
            style={{ boxShadow: '0 0 10px rgba(0,255,209,0.3)' }}
          />
          <div
            className="rounded-2xl p-5 border border-white/5 shadow-xl max-w-xs"
            style={{ background: '#161625' }}
          >
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              Traveler — two leaders are both claiming they speak for God. At the same time. Both mean it. Both have real power behind them.
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">
              Your mission: figure out how a world like that even works.
            </p>
          </div>
        </div>

        {/* Typing placeholder */}
        <div
          className="mt-4 ml-12 rounded-xl p-4 border flex-shrink-0"
          style={{ background: 'rgba(0,255,209,0.05)', borderColor: 'rgba(0,255,209,0.1)' }}
        >
          <div className="h-2 w-1/3 rounded mb-2" style={{ background: 'rgba(0,255,209,0.15)' }} />
          <div className="h-2 w-2/3 rounded" style={{ background: 'rgba(0,255,209,0.08)' }} />
        </div>
      </div>

      {/* Input bar */}
      <div className="p-5 border-t border-white/5 bg-black/20 flex-shrink-0">
        <div
          className="h-10 w-full rounded-full flex items-center px-4 border"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <span className="text-xs text-gray-600">Type your answer...</span>
        </div>
      </div>
    </div>
  );
}

function TrackPanel() {
  return (
    <div className="flex flex-col bg-white h-full overflow-y-auto relative">
      {/* Left fade for visual continuity */}
      <div
        className="absolute inset-y-0 left-0 w-10 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to right, rgba(13,13,13,0.15), transparent)' }}
      />
      <div className="p-8 flex flex-col gap-5">
        {/* Dashboard header */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">Ready for today&apos;s session?</h3>
          <p className="text-gray-500 text-xs mt-1">Choose a journey to begin guiding your students.</p>
        </div>

        {/* Student Spotlight */}
        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Student Spotlight</h4>
          <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2 bg-white flex items-center gap-2 border-b border-gray-100">
              <span className="text-[10px]">⚠️</span>
              <span className="text-gray-400 text-[10px]">Needs Check-in · 1 of 1</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="w-11 h-11 rounded-full flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-500" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-gray-800 text-sm">Thal-Prime</span>
                    <span className="bg-purple-100 text-purple-600 text-[9px] px-2 py-0.5 rounded-full font-bold">⚠️ CHECK IN</span>
                  </div>
                  <p className="text-xs text-gray-500 italic">Hasn&apos;t been engaging lately — may need a check-in.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 px-2 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 flex items-center justify-center gap-1 bg-white hover:bg-gray-50">
                  <span>🚩</span> Flag for follow-up
                </button>
                <button className="flex-1 py-2 px-2 border border-gray-200 rounded-lg text-[10px] font-bold text-teal-600 flex items-center justify-center gap-1 bg-white hover:bg-gray-50">
                  <span>💬</span> WhatsApp Thal-Prime
                </button>
              </div>
              <button className="w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 text-white" style={{ background: '#00966d' }}>
                <span>✓</span> Mark as done
              </button>
            </div>
          </div>
        </div>

        {/* Class Picture */}
        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Class Picture</h4>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center gap-3">
            <span>⚠️</span>
            <p className="text-xs text-gray-600 font-medium">1 student haven&apos;t been engaging since the last session.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Per-slide gradient border wrappers
const BORDER_GRADIENTS = [
  'linear-gradient(to right, #ff00cc, #333333)',                              // Explore: pink → dark
  'linear-gradient(135deg, rgba(126,34,206,0.7), rgba(0,255,209,0.4))',       // Guide: purple → teal
  'rgba(255,255,255,0.1)',                                                     // Track: subtle white
];

export default function WelcomeTour({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0);
  const { eyebrow, headline, copy } = SLIDES[slide];

  return (
    <main className="bg-grid min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Gradient border wrapper — 1px padding reveals the gradient as a border */}
      <div
        className="w-full max-w-5xl rounded-3xl p-px shadow-2xl"
        style={{ background: BORDER_GRADIENTS[slide], transition: 'background 0.3s ease' }}
      >
        <div
          className="rounded-3xl overflow-hidden flex flex-col md:flex-row"
          style={{
            background: slide === 2 ? '#0D0D0D' : '#0A0A0A',
            minHeight: '500px',
          }}
        >
          {/* Left — text content */}
          <section className="flex flex-col justify-between gap-8 p-10 md:p-12 flex-1">
            <div className="space-y-5">
              <span
                className="text-xs font-bold uppercase block"
                style={{ color: '#00F5D4', letterSpacing: '0.2em' }}
              >
                {eyebrow}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight text-white">{headline}</h1>
              <p className="text-lg leading-relaxed max-w-sm" style={{ color: 'rgba(156,163,175,1)' }}>
                {copy}
              </p>
            </div>

            {/* Footer: dots + nav */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                    style={{
                      height: '4px',
                      width: i === slide ? '24px' : '8px',
                      borderRadius: '9999px',
                      background: i === slide ? '#00F5D4' : 'rgba(75,85,99,1)',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'width 0.2s ease, background 0.2s ease',
                      boxShadow: i === slide ? '0 0 8px rgba(0,245,212,0.5)' : 'none',
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-6">
                {slide === 0 ? (
                  <button
                    onClick={onDone}
                    style={{
                      color: 'rgba(156,163,175,1)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textDecoration: 'underline',
                      textDecorationColor: 'rgba(75,85,99,0.6)',
                      textUnderlineOffset: '4px',
                    }}
                  >
                    Skip
                  </button>
                ) : (
                  <button
                    onClick={() => setSlide(slide - 1)}
                    style={{
                      color: 'rgba(156,163,175,1)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    ← Back
                  </button>
                )}

                {slide < SLIDES.length - 1 ? (
                  <button
                    onClick={() => setSlide(slide + 1)}
                    style={{
                      background: '#00F5D4',
                      color: '#000',
                      padding: '10px 24px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={onDone}
                    style={{
                      background: '#00F5D4',
                      color: '#000',
                      padding: '10px 24px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Start setup →
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Right — per-slide panel */}
          <section className="flex-1 overflow-hidden" style={{ minHeight: '380px' }}>
            {slide === 0 && <ExplorePanel />}
            {slide === 1 && <GuidePanel />}
            {slide === 2 && <TrackPanel />}
          </section>
        </div>
      </div>
    </main>
  );
}
