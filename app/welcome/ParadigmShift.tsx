'use client';
import Reveal from './Reveal';

const ROWS = [
  { from: 'To learn is to listen', to: 'To learn is to be engaged & curious' },
  { from: 'To teach is to tell', to: 'To teach is to facilitate discovery' },
  { from: 'Knowledge is memorised', to: 'Knowledge is constructed' },
  { from: 'Educated = passing a quiz', to: 'Educated = thinking critically' },
];

export default function ParadigmShift() {
  return (
    <section
      className="py-20 md:py-28"
      style={{ background: '#000', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="max-w-[760px] mx-auto px-6 text-center">
        <Reveal>
          <span className="font-space text-[11px] uppercase tracking-[0.24em] text-white/40">The Paradigm Shift</span>
          <h2 className="font-space font-bold text-2xl md:text-4xl mt-3 mb-10">
            From passive schooling to active mastery
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <div
            className="rounded-3xl text-left"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)', padding: '4px 32px' }}
          >
            {ROWS.map((r, i) => (
              <div
                key={i}
                className="grid items-center gap-3 py-4 font-inter text-sm md:text-base"
                style={{
                  gridTemplateColumns: '1fr auto 1fr',
                  borderBottom: i < ROWS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}
              >
                <span className="text-right text-white/35 line-through decoration-white/20">{r.from}</span>
                <span className="text-white/25">→</span>
                <span className="font-medium" style={{ color: '#00FF88' }}>{r.to}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
