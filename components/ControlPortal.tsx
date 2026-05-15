'use client';
import { motion } from 'framer-motion';

export interface PortalTask {
  id: string;
  label: string;
  count: number;
  color: string;        // hex
  shadowVal: string;    // "r,g,b" for rgba()
  icon: string;
}

const DEFAULT_TASKS: PortalTask[] = [
  { id: 'planets',   label: 'PLANETS TO EXPLORE', count: 4, color: '#00F5D4', shadowVal: '0,245,212',   icon: '◎' },
  { id: 'insights',  label: 'INSIGHTS NEEDED',    count: 2, color: '#FF0080', shadowVal: '255,0,128',   icon: '✦' },
  { id: 'questions', label: 'OPEN QUESTIONS',      count: 1, color: '#FFD600', shadowVal: '255,214,0',  icon: '?' },
];

interface ControlPortalProps {
  tasks?: PortalTask[];
  missionLabel?: string;
  totalPlanets?: number;
  exploredPlanets?: number;
}

export default function ControlPortal({
  tasks = DEFAULT_TASKS,
  missionLabel = 'MISSION 03',
  totalPlanets = 6,
  exploredPlanets = 2,
}: ControlPortalProps) {
  const progress = totalPlanets > 0 ? exploredPlanets / totalPlanets : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="flex flex-col gap-3"
      style={{
        background: 'rgba(7,7,15,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '16px 18px',
        minWidth: 220,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {/* Blinking status dot */}
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#FF0080' }}
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <span className="text-[9px] tracking-[0.3em] font-space text-white/35 uppercase">
            CONTROL
          </span>
        </div>
        <span className="text-[9px] tracking-wider font-space text-white/20 uppercase">
          {missionLabel}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] tracking-wider text-white/30 font-space uppercase">
            MISSION PROGRESS
          </span>
          <span className="text-[9px] font-space text-white/40">
            {exploredPlanets}/{totalPlanets}
          </span>
        </div>
        <div
          className="w-full h-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #FF0080, #00F5D4)',
              boxShadow: '0 0 8px rgba(0,245,212,0.4)',
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Divider */}
      <div
        className="w-full h-px"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      />

      {/* Task rows */}
      <div className="flex flex-col gap-2">
        {tasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + i * 0.1 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[11px]"
                style={{ color: task.color, filter: `drop-shadow(0 0 4px rgba(${task.shadowVal},0.6))` }}
              >
                {task.icon}
              </span>
              <span className="text-[10px] tracking-wide font-space text-white/45 uppercase">
                {task.label}
              </span>
            </div>

            {/* Badge */}
            <motion.span
              className="control-badge text-black font-black"
              style={{
                background: task.color,
                boxShadow: `0 0 8px rgba(${task.shadowVal},0.5)`,
              }}
              animate={task.count > 0 ? { scale: [1, 1.12, 1] } : undefined}
              transition={{ delay: 1.2 + i * 0.15, duration: 0.4, type: 'spring' }}
            >
              {task.count}
            </motion.span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
