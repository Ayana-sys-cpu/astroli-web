'use client';

import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

const STARS = [
  { top: '8%', left: '12%', delay: '0s' },
  { top: '15%', left: '80%', delay: '.5s' },
  { top: '30%', left: '45%', delay: '1s' },
  { top: '55%', left: '90%', delay: '1.5s' },
  { top: '70%', left: '8%', delay: '.8s' },
  { top: '85%', left: '60%', delay: '.3s' },
  { top: '40%', left: '25%', delay: '1.2s' },
  { top: '20%', left: '60%', delay: '.7s' },
  { top: '62%', left: '35%', delay: '1.7s' },
  { top: '10%', left: '35%', delay: '2s' },
];

function buildFrames(childName: string, journeyTitle: string) {
  return [
    {
      num: '01',
      icon: '✉️',
      orbClass: 'reveal-orb-blue',
      label: 'Invite arrives',
      copy: `${childName} gets an email, clicks it, and signs in with Google`,
    },
    {
      num: '02',
      icon: '🪐',
      orbClass: 'reveal-orb-purple',
      label: 'Their journey appears',
      copy: `They see the ${journeyTitle} you chose for them, waiting like a map of unexplored planets`,
    },
    {
      num: '03',
      icon: '🎯',
      orbClass: 'reveal-orb-teal',
      label: 'They pick a mission',
      copy: 'They decide which big idea to explore first — on their own',
    },
    {
      num: '04',
      icon: '✨',
      orbClass: 'reveal-orb-gold',
      label: 'Their AI guide begins',
      copy: 'Planet 1 starts — their companion asks the first question',
    },
  ];
}

export default function ParentRevealContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const childName    = searchParams.get('childName')    || 'your child';
  const journeyTitle = searchParams.get('journeyTitle') || 'the journey you chose';
  const frames       = buildFrames(childName, journeyTitle);

  return (
    <main className="reveal-bg relative min-h-screen flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      <style>{`
        .reveal-bg {
          background: radial-gradient(1200px 500px at 50% -10%, #12183a 0%, #05060f 60%);
        }
        .reveal-star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: #fff;
          border-radius: 50%;
          opacity: .5;
        }
        @media (prefers-reduced-motion: no-preference) {
          .reveal-star { animation: reveal-twinkle 3s infinite alternate; }
        }
        @keyframes reveal-twinkle {
          from { opacity: .15; }
          to   { opacity: .7; }
        }
        .reveal-gradient-text {
          background: linear-gradient(90deg, #4da6ff, #a78bfa);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .reveal-orb-blue   { background: radial-gradient(circle at 35% 30%, #7cc0ff, #1652a8); box-shadow: 0 0 24px rgba(77,166,255,.45); }
        .reveal-orb-purple { background: radial-gradient(circle at 35% 30%, #c9b7ff, #5b3fb8); box-shadow: 0 0 24px rgba(167,139,250,.45); }
        .reveal-orb-teal   { background: radial-gradient(circle at 35% 30%, #7ef0dd, #0e8b7a); box-shadow: 0 0 24px rgba(45,212,191,.45); }
        .reveal-orb-gold   { background: radial-gradient(circle at 35% 30%, #ffe08a, #b07a12); box-shadow: 0 0 24px rgba(251,191,36,.45); }
        .reveal-path-line {
          background: repeating-linear-gradient(180deg, #3b4470 0 6px, transparent 6px 14px);
        }
        .reveal-cta {
          background: linear-gradient(90deg, #4da6ff, #a78bfa);
          box-shadow: 0 6px 30px rgba(99,102,241,.4);
        }
      `}</style>

      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="reveal-star"
            style={{ top: s.top, left: s.left, animationDelay: s.delay }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-xl">
        <p className="text-center text-xs font-bold uppercase tracking-[.22em] text-teal-300">
          Mission ready
        </p>
        <h1 className="mt-3 text-center text-3xl font-extrabold leading-snug text-white">
          Here&apos;s what <span className="reveal-gradient-text">{childName}&apos;s</span> first
          session will look like
        </h1>
        <p className="mt-2 text-center text-[15px] text-slate-400">
          You&apos;ve done everything. Now it&apos;s their turn.
        </p>

        <div className="mx-auto mt-6 flex w-fit max-w-full items-center gap-2 rounded-full border border-sky-400/40 bg-sky-400/10 px-5 py-2 text-sm font-semibold text-sky-300">
          <span aria-hidden="true">🚀</span>
          <span className="truncate">{journeyTitle}</span>
        </div>

        <div className="relative mt-10">
          <div
            aria-hidden="true"
            className="reveal-path-line absolute bottom-7 left-[27px] top-7 w-[2px]"
          />
          <ol className="space-y-3">
            {frames.map(frame => (
              <li key={frame.num} className="relative flex items-start gap-5 py-2">
                <span
                  aria-hidden="true"
                  className={`${frame.orbClass} relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl`}
                >
                  {frame.icon}
                </span>
                <div className="flex-1 rounded-2xl border border-[#262d4d] bg-white/[.03] px-5 py-4">
                  <p className="text-base font-bold text-white">
                    <span className="mr-2 font-mono text-xs font-semibold text-slate-400">
                      {frame.num}
                    </span>
                    {frame.label}
                  </p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-slate-400">{frame.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <button
          onClick={() => router.push('/parent/dashboard')}
          className="reveal-cta mx-auto mt-9 block rounded-full px-9 py-3.5 text-[15px] font-bold text-white"
        >
          Go to your parent dashboard →
        </button>
        <p className="mt-4 text-center text-[12.5px] text-slate-400">
          The invite is already in {childName}&apos;s inbox 💌
        </p>
      </div>
    </main>
  );
}
