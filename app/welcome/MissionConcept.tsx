'use client';
import Reveal from './Reveal';

export default function MissionConcept() {
  return (
    <section id="mission" className="max-w-[1280px] mx-auto px-6 md:px-16 py-24 md:py-32">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

        {/* Text card */}
        <Reveal>
          <div
            className="rounded-3xl p-8 md:p-10 space-y-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,245,212,0.2)', borderLeft: '3px solid #00F5D4' }}
          >
            <span className="block font-space text-[11px] uppercase tracking-[0.18em] font-bold" style={{ color: '#00F5D4' }}>
              The Mission Concept
            </span>
            <h3 className="font-space font-bold text-2xl md:text-3xl leading-snug">
              Students don&apos;t study subjects. They embark on missions.
            </h3>
            <p className="text-white/60 leading-relaxed font-inter">
              Every journey starts with one Big Question — open-ended, genuinely worth wondering about,
              and sparking real curiosity. Chasing the answer is what builds actual understanding,
              not memorised facts for a quiz.
            </p>
            <p className="text-white/60 leading-relaxed font-inter">
              Underneath the deep-space exploration, every mission maps directly to the required
              junior-high science curriculum — rigour through depth, not more worksheets.
            </p>
          </div>
        </Reveal>

        {/* Fertile Question illustrative card */}
        <Reveal delay={0.1}>
          <div
            className="rounded-3xl p-8"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,245,212,0.2)', boxShadow: '0 0 50px rgba(0,245,212,0.06)' }}
          >
            {/* Mission label */}
            <div className="flex items-center gap-2 mb-5">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: '#00F5D4', boxShadow: '0 0 10px #00F5D4' }}
              />
              <span className="font-space text-[11px] uppercase tracking-[0.16em] text-white/50">
                Mission 04 · Energy &amp; Systems
              </span>
            </div>

            {/* Big Question */}
            <div
              className="rounded-2xl p-6 mb-5"
              style={{ background: 'rgba(0,245,212,0.05)', borderLeft: '3px solid #00F5D4' }}
            >
              <p className="font-space text-[10px] uppercase tracking-[0.15em] font-bold mb-2" style={{ color: '#00F5D4' }}>
                The Big Question
              </p>
              <p className="font-space text-lg italic leading-snug">
                &ldquo;How does energy change shape to power our world?&rdquo;
              </p>
            </div>

            {/* Curriculum chip */}
            <div className="flex items-center gap-2 text-[12px] text-white/40 font-space">
              Maps to:
              <span
                className="rounded-full px-3 py-1"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)' }}
              >
                NGSS MS-PS3-5
              </span>
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  );
}
