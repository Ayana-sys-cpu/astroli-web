'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WarpOverlayProps {
  active:     boolean;
  onComplete: () => void;
}

export default function WarpOverlay({ active, onComplete }: WarpOverlayProps) {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(onComplete, 820);
    return () => clearTimeout(timer);
  }, [active, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.82, times: [0, 0.15, 0.75, 1], ease: 'easeIn' }}
        >
          {/* Radial burst — centre expands outward */}
          <motion.div
            className="absolute inset-0"
            style={{ mixBlendMode: 'screen' }}
            initial={{ scale: 0.1 }}
            animate={{ scale: 4 }}
            transition={{ duration: 0.82, ease: [0.1, 0.4, 0.9, 1] }}
          >
            <div
              className="w-full h-full"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.98) 0%, rgba(205,155,255,0.7) 20%, rgba(0,245,212,0.4) 40%, transparent 65%)',
              }}
            />
          </motion.div>

          {/* Speed lines — thin radial streaks */}
          <motion.div
            className="absolute inset-0"
            style={{ mixBlendMode: 'screen' }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.6, 0], scale: [0.5, 3] }}
            transition={{ duration: 0.82, ease: 'easeIn' }}
          >
            <div
              className="w-full h-full"
              style={{
                background: `
                  repeating-conic-gradient(
                    from 0deg at 50% 50%,
                    transparent 0deg,
                    rgba(255,255,255,0.06) 0.4deg,
                    transparent 0.8deg
                  )
                `,
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
