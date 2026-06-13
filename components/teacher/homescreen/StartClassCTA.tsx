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
      <div className="glass-panel" style={{
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-space)', color: '#1a1a2e', marginBottom: 4 }}>
            Ready for today's session?
          </div>
          <div style={{ fontSize: 13, color: 'rgba(26,26,46,0.5)', fontFamily: 'var(--font-inter)' }}>
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
            background: disabled ? 'rgba(26,26,46,0.06)' : 'linear-gradient(135deg, #FF0080, #8B00FF)',
            border: disabled ? '1px solid rgba(26,26,46,0.12)' : 'none',
            color: disabled ? 'rgba(26,26,46,0.3)' : '#fff',
            fontSize: 13,
            fontFamily: 'var(--font-space)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: disabled ? 'none' : '0 0 24px rgba(255,0,128,0.45), 0 4px 14px rgba(139,0,255,0.35)',
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
              className="glass-panel"
              style={{ padding: 28, width: 340 }}
            >
              <div style={{ fontSize: 14, fontFamily: 'var(--font-space)', fontWeight: 700, color: '#1a1a2e', marginBottom: 16, letterSpacing: '0.05em' }}>
                WHICH CLASS ARE YOU STARTING?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {journeys.map(j => (
                  <button key={j.id} onClick={() => activate(j.id)} style={{
                    background: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(255,255,255,0.75)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    color: 'rgba(26,26,46,0.85)',
                    fontFamily: 'var(--font-inter)',
                    fontSize: 13,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'rgba(0,245,212,0.4)'; (e.target as HTMLElement).style.color = '#1a1a2e'; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.75)'; (e.target as HTMLElement).style.color = 'rgba(26,26,46,0.85)'; }}
                  >
                    ○ {j.title}
                  </button>
                ))}
              </div>
              <button onClick={() => setPicking(false)} style={{ marginTop: 16, background: 'none', border: 'none', color: 'rgba(26,26,46,0.3)', fontSize: 11, fontFamily: 'var(--font-space)', cursor: 'pointer', letterSpacing: '0.08em' }}>
                CANCEL
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
