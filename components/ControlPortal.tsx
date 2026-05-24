'use client';
import { motion } from 'framer-motion';

interface ProgressStripProps {
  totalPlanets: number;
  exploredPlanets: number;
  insightCount?: number;
}

export default function ControlPortal({
  totalPlanets,
  exploredPlanets,
  insightCount = 2,
}: ProgressStripProps) {
  const remaining = totalPlanets - exploredPlanets;
  const progress  = totalPlanets > 0 ? exploredPlanets / totalPlanets : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      className="absolute bottom-5 left-5 right-5 z-20 flex items-center gap-7"
      style={{
        background:    'rgba(7,7,18,0.92)',
        border:        '1px solid rgba(0,245,212,0.15)',
        borderRadius:  18,
        padding:       '18px 28px',
        backdropFilter: 'blur(20px)',
        boxShadow:     '0 0 60px rgba(0,245,212,0.05), 0 8px 40px rgba(0,0,0,0.7)',
      }}
    >
      {/* ── Planet progress ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="text-xl leading-none"
              style={{ color: '#00F5D4', filter: 'drop-shadow(0 0 8px rgba(0,245,212,0.9))' }}
            >
              ◎
            </span>
            <span className="text-[15px] font-bold tracking-[0.05em] text-white/90 uppercase font-space">
              Planets to Explore
            </span>
          </div>
          <span
            className="text-[15px] font-extrabold tracking-[0.04em] font-space"
            style={{ color: '#00F5D4', textShadow: '0 0 12px rgba(0,245,212,0.6)' }}
          >
            {remaining} left
          </span>
        </div>

        <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{
              background:  'linear-gradient(90deg, #FF0080, #00F5D4)',
              boxShadow:   '0 0 14px rgba(0,245,212,0.6)',
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ delay: 1, duration: 1.2, ease: 'easeOut' }}
          />
        </div>

        <span className="text-xs font-medium tracking-[0.07em] font-space" style={{ color: 'rgba(255,255,255,0.38)' }}>
          {exploredPlanets} of {totalPlanets} explored
        </span>
      </div>

      {/* ── Divider ────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0"
        style={{ width: 1, height: 52, background: 'rgba(255,255,255,0.1)' }}
      />

      {/* ── Insights count ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-shrink-0 pl-1">
        <motion.span
          className="text-2xl leading-none"
          style={{ color: '#FF0080' }}
          animate={{
            filter: [
              'drop-shadow(0 0 10px rgba(255,0,128,0.9))',
              'drop-shadow(0 0 18px rgba(255,0,128,1))',
              'drop-shadow(0 0 10px rgba(255,0,128,0.9))',
            ],
          }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          ✦
        </motion.span>
        <div className="flex flex-col gap-1">
          <span
            className="font-extrabold leading-none font-space"
            style={{
              fontSize:    36,
              color:       '#FF0080',
              textShadow:  '0 0 24px rgba(255,0,128,0.55)',
              letterSpacing: '-0.02em',
            }}
          >
            {insightCount}
          </span>
          <span
            className="text-xs font-semibold tracking-[0.12em] uppercase font-space"
            style={{ color: 'rgba(255,255,255,0.42)' }}
          >
            Insights saved
          </span>
        </div>
      </div>
    </motion.div>
  );
}
