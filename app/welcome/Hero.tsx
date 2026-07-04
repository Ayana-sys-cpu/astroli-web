'use client';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import TiltPanel from './TiltPanel';

const CHAT_BUBBLES = [
  { who: 'Marie-Anne', text: 'What happens to the total mass when iron rusts — does it increase, decrease, or stay the same?' },
  { who: 'Student', text: 'I think it stays the same? Because nothing disappears?' },
  { who: 'Marie-Anne', text: "Exactly the right instinct. Now — where does the extra weight you can measure actually come from?" },
  { who: 'Student', text: 'From the air? Like oxygen bonding to the iron?' },
];

export default function Hero() {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: panelRef, offset: ['start end', 'end start'] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [-30, 30]);

  return (
    <section className="max-w-[1280px] mx-auto px-6 md:px-16 pt-40 md:pt-48 pb-20 md:pb-32">
      <motion.div
        className="absolute pointer-events-none -z-10"
        style={{
          width: 900, height: 600, top: 0, left: '50%', translateX: '-50%',
          background: 'radial-gradient(ellipse, rgba(139,0,255,0.14) 0%, rgba(0,245,212,0.06) 45%, transparent 70%)',
          filter: 'blur(10px)',
        }}
        animate={reduceMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
        transition={reduceMotion ? undefined : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="max-w-2xl mx-auto text-center space-y-8 mb-16">
        <h1 className="font-space font-bold text-4xl md:text-6xl leading-[1.08] tracking-tight">
          Bring back the <span className="gradient-wordmark">joy of learning</span>.
        </h1>
        <p className="text-white/60 text-lg leading-relaxed max-w-xl mx-auto font-inter">
          A deep-space pedagogical environment designed for the next generation of explorers.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <a
            href="#signup"
            className="font-space text-sm font-bold uppercase tracking-[0.1em] px-8 py-4 rounded-full text-white transition-transform hover:scale-105"
            style={{ background: '#FF0080', boxShadow: '0 0 30px rgba(255,0,128,0.4)' }}
          >
            Start Free Trial
          </a>
          <a
            href="#mission"
            className="font-space text-sm font-bold uppercase tracking-[0.1em] px-8 py-4 rounded-full text-white/80 border border-white/15 hover:border-white/30 transition-colors"
          >
            See How It Works
          </a>
        </div>
      </div>

      {/* Planet drill-down composite: character video + live chat panel */}
      <motion.div ref={panelRef} style={{ y: parallaxY, position: 'relative' }}>
        <TiltPanel
          strength={3}
          className="rounded-3xl relative max-w-5xl mx-auto overflow-hidden"
          style={{
            background: '#06060f',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 80px rgba(0,0,0,0.7), 0 0 60px rgba(139,0,255,0.12)',
          }}
        >
          {/* Faux browser chrome */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
          >
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(255,80,80,0.45)' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(255,200,80,0.45)' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(80,200,80,0.45)' }} />
            <span
              className="ml-2 flex-1 rounded-md px-3 py-1 font-space text-[11px]"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }}
            >
              astroli.app / landscape / chemistry
            </span>
          </div>

          {/* Split: video left (~65%) + chat right (~35%) */}
          <div className="grid" style={{ gridTemplateColumns: '65fr 35fr', minHeight: 420 }}>
            {/* Character video */}
            <div className="relative" style={{ background: '#020209' }}>
              <video
                autoPlay
                muted
                loop
                playsInline
                poster="/marketing/marie-anne-portrait.jpg"
                className="w-full h-full object-cover"
                style={{ minHeight: 420 }}
              >
                <source src="/marketing/marie-anne-listening.mp4" type="video/mp4" />
              </video>
              {/* Character label overlay */}
              <div className="absolute bottom-4 left-4">
                <p className="font-space text-[10px] uppercase tracking-widest text-white/40 mb-0.5">1743–1789 CE</p>
                <p className="font-space font-bold text-white text-base leading-tight">Marie-Anne Pierrette Paulze Lavoisier</p>
              </div>
            </div>

            {/* Chat panel */}
            <div
              className="flex flex-col justify-between p-5 border-l"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            >
              <div className="space-y-3 flex-1 overflow-hidden">
                {CHAT_BUBBLES.map((b, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed font-inter ${b.who === 'Student' ? 'ml-2' : 'mr-2'}`}
                    style={
                      b.who === 'Student'
                        ? { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }
                        : { background: 'rgba(139,0,255,0.12)', border: '1px solid rgba(139,0,255,0.25)', color: 'rgba(255,255,255,0.8)' }
                    }
                  >
                    <span className="block font-space text-[9px] uppercase tracking-widest mb-1 opacity-40">{b.who}</span>
                    {b.text}
                  </div>
                ))}
              </div>
              {/* Faux input bar */}
              <div
                className="mt-4 rounded-xl px-4 py-3 flex items-center gap-2 font-inter text-[13px]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.2)' }}
              >
                Ask anything…
                <span
                  className="ml-auto flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(139,0,255,0.5)' }}
                >
                  ↑
                </span>
              </div>
            </div>
          </div>

          {/* LIVE badge */}
          <div
            className="absolute bottom-3 right-3 rounded-2xl px-4 py-2.5 hidden md:block"
            style={{
              background: 'rgba(7,7,15,0.88)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,245,212,0.3)',
              boxShadow: '0 0 24px rgba(0,245,212,0.2)',
            }}
          >
            <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest font-space">Live product screen</p>
            <p className="text-sm font-bold font-space" style={{ color: '#00F5D4' }}>No mockups. This is Astroli.</p>
          </div>
        </TiltPanel>
      </motion.div>
    </section>
  );
}
