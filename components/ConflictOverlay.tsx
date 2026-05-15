'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CORE_CONFLICTS } from '@/lib/mock-data';

interface ConflictOverlayProps {
  isOpen: boolean;
  onSelect: (id: string) => void;
  onDismiss: () => void;
}

const CONFLICT_META = [
  {
    id: 'pillars',
    color: '#00F5D4',
    glow: 'rgba(0,245,212,0.3)',
    shadowVal: '0,245,212',
    tagline: 'ORDER IS TRUTH',
  },
  {
    id: 'power',
    color: '#FF0080',
    glow: 'rgba(255,0,128,0.3)',
    shadowVal: '255,0,128',
    tagline: 'FREEDOM IS TRUTH',
  },
];

export default function ConflictOverlay({ isOpen, onSelect, onDismiss }: ConflictOverlayProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    if (selected) return;
    setSelected(id);
    setTimeout(() => onSelect(id), 900);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="conflict-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8"
          style={{ background: 'rgba(0,0,0,0.94)', backdropFilter: 'blur(10px)' }}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <motion.p
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-[10px] tracking-[0.45em] text-white/35 font-space uppercase mb-5"
          >
            THE CORE CONFLICT
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.38, duration: 0.55, ease: 'easeOut' }}
            className="font-space font-black text-center mb-10 leading-tight"
            style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', maxWidth: 680 }}
          >
            In a moment of crisis —{' '}
            <span
              style={{
                color: '#FF0080',
                textShadow: '0 0 30px rgba(255,0,128,0.5)',
              }}
            >
              who gets the final word
            </span>{' '}
            on what is real?
          </motion.h2>

          {/* ── Two choices ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-5 w-full max-w-3xl">
            {CORE_CONFLICTS.map((conflict, i) => {
              const meta = CONFLICT_META.find((m) => m.id === conflict.id)!;
              const isHov = hovered === conflict.id;
              const isSel = selected === conflict.id;
              const isOther = selected && selected !== conflict.id;

              return (
                <motion.button
                  key={conflict.id}
                  initial={{ opacity: 0, x: i === 0 ? -80 : 80 }}
                  animate={{
                    opacity: isOther ? 0.25 : 1,
                    x: 0,
                    scale: isSel ? 1.03 : 1,
                  }}
                  transition={{
                    opacity: { delay: 0.55 + i * 0.12, duration: 0.45 },
                    x: { delay: 0.55 + i * 0.12, duration: 0.45, type: 'spring', damping: 22, stiffness: 180 },
                    scale: { duration: 0.3 },
                  }}
                  onClick={() => handleSelect(conflict.id)}
                  onMouseEnter={() => setHovered(conflict.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="relative flex flex-col gap-5 p-8 rounded-2xl text-left overflow-hidden cursor-pointer"
                  style={{
                    background: isSel
                      ? `rgba(${meta.shadowVal},0.1)`
                      : isHov
                      ? `rgba(${meta.shadowVal},0.05)`
                      : 'rgba(255,255,255,0.025)',
                    border: `2px solid ${isSel || isHov ? meta.color : 'rgba(255,255,255,0.09)'}`,
                    boxShadow: isSel
                      ? `0 0 50px rgba(${meta.shadowVal},0.35), inset 0 0 40px rgba(${meta.shadowVal},0.06)`
                      : isHov
                      ? `0 0 24px rgba(${meta.shadowVal},0.18)`
                      : 'none',
                    transition: 'background 0.2s, border-color 0.2s, box-shadow 0.25s',
                  }}
                >
                  {/* Tagline */}
                  <span
                    className="text-[9px] tracking-[0.35em] font-space uppercase font-bold"
                    style={{ color: meta.color, opacity: isHov || isSel ? 1 : 0.5 }}
                  >
                    {meta.tagline}
                  </span>

                  {/* Icon */}
                  <span style={{ fontSize: 52 }}>{conflict.icon}</span>

                  {/* Title */}
                  <h3
                    className="font-space font-black text-2xl leading-snug"
                    style={{ color: isHov || isSel ? meta.color : 'rgba(255,255,255,0.85)' }}
                  >
                    {conflict.title}
                  </h3>

                  {/* Description */}
                  <p className="font-inter text-sm text-white/55 leading-relaxed">
                    {conflict.description}
                  </p>

                  {/* Selected confirmation flash */}
                  {isSel && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-black font-black text-lg"
                      style={{
                        background: meta.color,
                        boxShadow: `0 0 20px ${meta.glow}`,
                      }}
                    >
                      ✓
                    </motion.div>
                  )}

                  {/* Hover indicator bar */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: meta.color, opacity: isHov || isSel ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.button>
              );
            })}
          </div>

          {/* ── Dismiss ────────────────────────────────────────────── */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            onClick={onDismiss}
            className="mt-8 text-[10px] tracking-[0.3em] text-white/20 font-space uppercase hover:text-white/45 transition-colors"
          >
            DECIDE LATER →
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
