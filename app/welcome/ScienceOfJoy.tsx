'use client';
import { motion, useReducedMotion } from 'framer-motion';
import Reveal from './Reveal';

const UNDERSTANDING_LEVELS = [
  { n: 1, label: 'Explaining' },
  { n: 2, label: 'Providing Evidence' },
  { n: 3, label: 'Finding Examples' },
  { n: 4, label: 'Making Analogies' },
  { n: 5, label: 'Generalizing' },
];

export default function ScienceOfJoy() {
  const reduceMotion = useReducedMotion();
  return (
    <section id="intrinsic" className="bg-black border-y border-white/10 py-24 md:py-32">
      <div className="max-w-[1280px] mx-auto px-6 md:px-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <Reveal className="space-y-6">
          <span className="font-space text-[11px] uppercase tracking-[0.24em] text-white/50">Intrinsic Motivation</span>
          <h2 className="font-space font-bold text-3xl md:text-5xl text-white leading-tight">
            No grades. No tests.<br />
            <span className="text-neon-green">No fear of failure.</span>
          </h2>
          <p className="text-white/70 text-lg leading-relaxed font-inter max-w-xl">
            Traditional schooling relies on grades and test pressure to motivate students.
            The research is clear: this breeds anxiety, not curiosity.
          </p>
          <p className="text-white/70 text-lg leading-relaxed font-inter max-w-xl">
            Astroli evaluates understanding entirely in the background — no quizzes, no scores,
            no interruptions. As a student explores and converses, the platform continuously
            measures how deeply they&apos;ve genuinely grasped the concept, from being able to
            explain it all the way to applying it in novel contexts.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="rounded-3xl p-8 md:p-10 bg-white/[0.03] border border-white/15">
          <h4 className="font-space font-bold text-white mb-2">Levels of real understanding</h4>
          <p className="text-white/50 text-sm mb-8 font-inter">
            The system measures different depths of understanding — from simply explaining
            a concept to generalizing it across entirely new situations.
          </p>
          <div className="space-y-3">
            {UNDERSTANDING_LEVELS.map((l) => (
              <div key={l.n} className="flex items-center gap-4">
                <span className="w-6 text-right font-space text-xs text-white/40">{l.n}</span>
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-neon-green"
                    style={{ opacity: 0.35 + l.n * 0.13, width: reduceMotion ? `${(l.n / UNDERSTANDING_LEVELS.length) * 100}%` : undefined }}
                    initial={reduceMotion ? false : { width: 0 }}
                    whileInView={reduceMotion ? undefined : { width: `${(l.n / UNDERSTANDING_LEVELS.length) * 100}%` }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.7, delay: l.n * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <span className="w-36 text-xs font-space text-white/60 uppercase tracking-wide">{l.label}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
