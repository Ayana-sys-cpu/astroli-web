'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const REEL = [
  'EXPLORER',
  'DETECTIVE',
  'PIONEER',
  'HISTORIAN',
  'ANALYST',
  'AGENT',
  'INVESTIGATOR',
  'SCHOLAR',
  'SENTINEL',
];

interface SlotMachineProps {
  finalRole?: string;
  onComplete?: () => void;
  delay?: number; // ms before reel starts spinning
}

export default function SlotMachine({
  finalRole = 'INVESTIGATOR',
  onComplete,
  delay = 800,
}: SlotMachineProps) {
  const [displayIndex, setDisplayIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const frameRef = useRef(0);
  const countRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const start = setTimeout(() => {
      setShowLabel(true);
      spin();
    }, delay);

    return () => {
      clearTimeout(start);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  function spin() {
    const totalFrames = 22;
    const baseInterval = 70;

    function tick() {
      countRef.current++;
      const progress = countRef.current / totalFrames;
      // Ease-out: interval grows as we near the end
      const interval = baseInterval + progress * progress * 320;

      setDisplayIndex((prev) => (prev + 1) % REEL.length);

      if (countRef.current >= totalFrames) {
        // Snap to final role
        const finalIdx = REEL.indexOf(finalRole);
        setDisplayIndex(finalIdx >= 0 ? finalIdx : 0);
        setLocked(true);
        onComplete?.();
      } else {
        timerRef.current = setTimeout(tick, interval);
      }
    }

    timerRef.current = setTimeout(tick, baseInterval);
  }

  return (
    <AnimatePresence>
      {showLabel && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-1"
        >
          <p className="text-[9px] tracking-[0.35em] text-white/30 font-space uppercase">
            YOU ARE A
          </p>

          {/* Slot window */}
          <div className="slot-window w-64">
            <AnimatePresence mode="wait">
              {locked ? (
                <motion.p
                  key="locked"
                  initial={{ opacity: 0, scale: 1.3, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', damping: 14, stiffness: 200 }}
                  className="font-space font-black text-4xl tracking-[0.15em] neon-magenta"
                >
                  {finalRole}
                </motion.p>
              ) : (
                <motion.p
                  key={displayIndex}
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 0.6, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.06 }}
                  className="font-space font-black text-4xl tracking-[0.15em] text-white/60"
                >
                  {REEL[displayIndex]}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Locked state: tick line */}
          {locked && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
              className="h-px w-40 mt-1"
              style={{ background: 'linear-gradient(90deg, transparent, #FF0080, transparent)' }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
