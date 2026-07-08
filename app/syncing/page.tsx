'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import StarField from '@/components/StarField';

/* Constellation map nodes and edges */
const NODES: [number, number][] = [
  [50, 38], [27, 22], [73, 20], [80, 55],
  [20, 58], [50, 72], [14, 40], [86, 38],
  [35, 55], [65, 52],
];
const EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
  [1, 6], [2, 7], [0, 8], [0, 9],
];

const STATUS_STEPS = [
  'LOADING MISSION DATA',
  'SYNCING AVATAR',
  'MAPPING CONSTELLATIONS',
  'ALMOST READY',
];

export default function SyncingPage() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    // Race: wait for the animation (3.2s) AND the journey check, then route.
    // studentId comes from the server session — not passed in the URL.
    const delay = new Promise<void>((res) => setTimeout(res, 3200));
    const journeyCheck = fetch('/api/student/journey')
      .then((r) => {
        // 401 = no session — send back to login rather than silently
        // treating it as "no active journey" (which traps the student).
        if (r.status === 401 || r.status === 403) return { __redirect: '/' };
        return r.json();
      })
      .catch(() => ({ __redirect: '/' }));

    Promise.all([delay, journeyCheck]).then(([, data]) => {
      if (!alive) return;
      if ((data as any).__redirect) { router.replace((data as any).__redirect); return; }
      // Multi-journey: always land on the home hub, which lists every
      // enrolled class by its own state. See
      // docs/superpowers/specs/2026-06-16-student-multi-journey-home-design.md.
      router.replace('/home');
    });

    return () => { alive = false; };
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden"
    >
      <StarField count={100} seed={17} />

      {/* ── Constellation SVG ───────────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <filter id="node-glow">
            <feGaussianBlur stdDeviation="1.2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {EDGES.map(([a, b], i) => (
          <motion.line
            key={i}
            x1={NODES[a][0]} y1={NODES[a][1]}
            x2={NODES[b][0]} y2={NODES[b][1]}
            stroke="rgba(0,245,212,0.22)"
            strokeWidth="0.3"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.18, duration: 0.7, ease: 'easeOut' }}
          />
        ))}

        {/* Nodes */}
        {NODES.map(([cx, cy], i) => (
          <motion.circle
            key={i}
            cx={cx} cy={cy}
            r={i === 0 ? 2.2 : 1.1}
            fill={i === 0 ? 'rgba(0,245,212,0.9)' : 'rgba(0,245,212,0.45)'}
            filter="url(#node-glow)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.13, duration: 0.4, type: 'spring', damping: 14 }}
          />
        ))}

        {/* Pulse ring on central node */}
        <motion.circle
          cx={NODES[0][0]} cy={NODES[0][1]}
          r={4}
          fill="none"
          stroke="rgba(0,245,212,0.3)"
          strokeWidth="0.4"
          initial={{ scale: 0.5, opacity: 0.8 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ delay: 1.2, duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        />
      </svg>

      {/* Scan line overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="scan-line" />
      </div>

      {/* ── Status text ─────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="font-caveat text-3xl text-white/80 tracking-wide"
        >
          Preparing your Mission...
        </motion.p>

        {/* Cycling status labels */}
        <div className="flex flex-col items-center gap-1">
          {STATUS_STEPS.map((step, i) => (
            <motion.p
              key={step}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: [0, 0.6, 0.6, 0] }}
              transition={{
                delay: 0.8 + i * 0.55,
                duration: 0.6,
                times: [0, 0.15, 0.75, 1],
              }}
              className="text-[9px] tracking-[0.3em] text-[#00F5D4]/60 font-space uppercase"
            >
              {step}
            </motion.p>
          ))}
        </div>

        {/* Loading bar */}
        <motion.div
          className="mt-2 h-px rounded-full overflow-hidden"
          style={{ width: 160, background: 'rgba(255,255,255,0.06)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #FF0080, #00F5D4)',
              boxShadow: '0 0 6px rgba(0,245,212,0.5)',
            }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.6, duration: 2.4, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
