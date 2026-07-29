'use client';
import { motion } from 'framer-motion';

/**
 * The card's own silhouette while it loads — same panel, same portrait shape,
 * same hook line and button. Nothing moves when the real edit lands, and the
 * student can see something is on its way instead of a hole in the screen.
 */
export default function CuriosityGhost() {
  return (
    <motion.div
      animate={{ opacity: [0.5, 0.85, 0.5] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      className="relative w-full overflow-hidden rounded-[9px]"
      style={{ aspectRatio: '9 / 16', maxHeight: '68vh', background: 'rgba(255,255,255,0.035)' }}
      aria-hidden
    >
      <span
        className="absolute left-2.5 top-2.5 h-[22px] w-[104px] rounded-full"
        style={{ background: 'rgba(0,229,255,0.10)', border: '1px solid rgba(0,229,255,0.18)' }}
      />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-3">
        <div className="flex flex-col gap-2">
          <span className="h-3 w-[88%] rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }} />
          <span className="h-3 w-[62%] rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }} />
        </div>
        <span className="h-[38px] w-full rounded-full" style={{ background: 'rgba(139,0,255,0.22)' }} />
      </div>
    </motion.div>
  );
}
