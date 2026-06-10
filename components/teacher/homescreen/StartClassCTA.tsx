'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Journey { id: string; title: string; }

interface Props { journeys: Journey[]; }

export default function StartClassCTA({ journeys }: Props) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [loading, setLoading] = useState(false);

  async function activate(journeyId: string) {
    setLoading(true);
    await fetch('/api/teacher/class-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ journeyId }),
    });
    router.push(`/teacher/journey/${journeyId}`);
  }

  async function handleClick() {
    if (journeys.length === 0) return;
    if (journeys.length === 1) { await activate(journeys[0].id); return; }
    setPicking(true);
  }

  const disabled = journeys.length === 0;

  return (
    <>
      {/* CTA Banner */}
      <div style={{
        position: 'relative',
        borderRadius: 16,
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(7,7,15,0.95) 0%, rgba(124,58,237,0.12) 100%)',
        border: '1px solid rgba(124,58,237,0.3)',
        boxShadow: '0 0 40px rgba(124,58,237,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        overflow: 'hidden',
      }}>
        {/* Subtle micro-stars in banner */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {[...Array(18)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${(i * 37 + 11) % 100}%`,
              top: `${(i * 53 + 7) % 100}%`,
              width: (i % 3) + 1,
              height: (i % 3) + 1,
              borderRadius: '50%',
              background: '#fff',
              opacity: 0.08 + (i % 4) * 0.04,
            }} />
          ))}
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-space)', color: '#fff', marginBottom: 4 }}>
            Ready for today's session?
          </div>
          <div style={{ fontSize: 13, color: 'rgba(232,232,240,0.5)', fontFamily: 'var(--font-inter)' }}>
            {disabled ? 'No active journeys — create one in Journeys.' : 'Choose a journey to begin guiding your students.'}
          </div>
        </div>

        <motion.button
          whileHover={disabled ? {} : { scale: 1.03, boxShadow: '0 0 28px rgba(0,245,212,0.5)' }}
          whileTap={disabled ? {} : { scale: 0.97 }}
          onClick={handleClick}
          disabled={disabled || loading}
          style={{
            flexShrink: 0,
            padding: '12px 24px',
            borderRadius: 40,
            background: disabled ? 'rgba(255,255,255,0.08)' : 'rgba(7,7,15,0.9)',
            border: `1.5px solid ${disabled ? 'rgba(255,255,255,0.15)' : '#00F5D4'}`,
            color: disabled ? 'rgba(255,255,255,0.3)' : '#fff',
            fontSize: 13,
            fontFamily: 'var(--font-space)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: disabled ? 'none' : '0 0 16px rgba(0,245,212,0.25)',
            transition: 'all 0.2s',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {loading ? '⏳' : '▶'} {loading ? 'STARTING…' : 'START CLASS'}
        </motion.button>
      </div>

      {/* Journey picker modal */}
      <AnimatePresence>
        {picking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setPicking(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#0C0C18',
                border: '1px solid rgba(124,58,237,0.35)',
                borderRadius: 16,
                padding: 28,
                width: 340,
                boxShadow: '0 0 48px rgba(124,58,237,0.2)',
              }}
            >
              <div style={{ fontSize: 14, fontFamily: 'var(--font-space)', fontWeight: 700, color: '#fff', marginBottom: 16, letterSpacing: '0.05em' }}>
                WHICH CLASS ARE YOU STARTING?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {journeys.map(j => (
                  <button key={j.id} onClick={() => activate(j.id)} style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    color: 'rgba(232,232,240,0.85)',
                    fontFamily: 'var(--font-inter)',
                    fontSize: 13,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'rgba(0,245,212,0.4)'; (e.target as HTMLElement).style.color = '#fff'; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.target as HTMLElement).style.color = 'rgba(232,232,240,0.85)'; }}
                  >
                    ○ {j.title}
                  </button>
                ))}
              </div>
              <button onClick={() => setPicking(false)} style={{ marginTop: 16, background: 'none', border: 'none', color: 'rgba(232,232,240,0.3)', fontSize: 11, fontFamily: 'var(--font-space)', cursor: 'pointer', letterSpacing: '0.08em' }}>
                CANCEL
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
