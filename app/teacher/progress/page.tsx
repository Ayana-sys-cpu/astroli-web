'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getTeacherId } from '@/lib/teacher-store';

interface Mission {
  id: string;
  question: string;
  projectTitle: string;
  state: string;
  order: number;
}

interface Journey {
  id: string;
  title: string;
  missions: Mission[];
}

const MOCK_STUDENTS = [
  'Alex R.', 'Bailey M.', 'Casey T.', 'Devon K.', 'Ellis J.',
  'Finley A.', 'Gray B.', 'Harper C.', 'Indigo P.', 'Jordan S.',
];

const STATUS_COLOR: Record<string, string> = {
  completed: '#00F5A0',
  in_progress: '#00D4FF',
  not_started: 'rgba(232,232,240,0.1)',
};

function randomStatus(): string {
  const r = Math.random();
  return r < 0.45 ? 'completed' : r < 0.7 ? 'in_progress' : 'not_started';
}

export default function ProgressMatrix() {
  const [journeys, setJourneys]   = useState<Journey[]>([]);
  const [activeJourney, setActive] = useState<Journey | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const teacherId = getTeacherId();
    if (!teacherId) return;
    fetch(`/api/teacher/journeys?teacherId=${teacherId}`)
      .then(r => r.json())
      .then(d => {
        const j: Journey[] = d.journeys ?? [];
        setJourneys(j);
        if (j.length > 0) setActive(j[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const missions = activeJourney?.missions ?? [];

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1
          className="font-space font-black tracking-[0.12em] mb-1"
          style={{ fontSize: 28, color: '#E8E8F0' }}
        >
          PROGRESS MATRIX
        </h1>
        <p className="font-inter text-sm" style={{ color: 'rgba(232,232,240,0.4)' }}>
          Student progress across missions and planets
        </p>
      </motion.div>

      {/* Journey tabs */}
      {journeys.length > 1 && (
        <div className="flex gap-2 mb-6">
          {journeys.map(j => (
            <button
              key={j.id}
              onClick={() => setActive(j)}
              className="px-4 py-2 rounded-lg text-[11px] font-space font-bold tracking-[0.12em] transition-all"
              style={{
                background: activeJourney?.id === j.id ? 'rgba(124,58,237,0.22)' : 'rgba(232,232,240,0.04)',
                color:      activeJourney?.id === j.id ? '#E8E8F0' : 'rgba(232,232,240,0.4)',
                border:     `1px solid ${activeJourney?.id === j.id ? 'rgba(124,58,237,0.4)' : 'rgba(232,232,240,0.08)'}`,
              }}
            >
              {j.title}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 mt-24 justify-center">
          <span className="w-5 h-5 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
          <span className="font-space text-xs tracking-widest text-white/30">LOADING…</span>
        </div>
      ) : missions.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 gap-3">
          <p className="font-space text-sm tracking-widest" style={{ color: 'rgba(232,232,240,0.3)' }}>
            NO MISSIONS TO DISPLAY
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-x-auto"
        >
          <table className="w-full border-collapse text-left" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th
                  className="pb-3 pr-4 font-space text-[10px] tracking-[0.15em] font-bold"
                  style={{ color: 'rgba(232,232,240,0.35)', width: 140, borderBottom: '1px solid rgba(232,232,240,0.08)' }}
                >
                  STUDENT
                </th>
                {missions.map(m => (
                  <th
                    key={m.id}
                    className="pb-3 px-3 font-space text-[9px] tracking-[0.1em] font-bold text-center"
                    style={{ color: 'rgba(232,232,240,0.35)', borderBottom: '1px solid rgba(232,232,240,0.08)', maxWidth: 100 }}
                  >
                    <div className="truncate max-w-[90px] mx-auto" title={m.question}>
                      M{m.order}
                    </div>
                    <div
                      className="mt-0.5 text-[8px] tracking-widest"
                      style={{ color: m.state === 'active' ? '#00D4FF' : 'rgba(232,232,240,0.2)' }}
                    >
                      {m.state}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_STUDENTS.map((student, si) => (
                <tr key={student} className="group">
                  <td
                    className="py-3 pr-4 font-inter text-sm"
                    style={{
                      color: 'rgba(232,232,240,0.7)',
                      borderBottom: '1px solid rgba(232,232,240,0.05)',
                    }}
                  >
                    {student}
                  </td>
                  {missions.map(m => {
                    const status = randomStatus();
                    return (
                      <td
                        key={m.id}
                        className="py-3 px-3 text-center"
                        style={{ borderBottom: '1px solid rgba(232,232,240,0.05)' }}
                      >
                        <div
                          className="w-5 h-5 rounded-full mx-auto"
                          style={{
                            background: STATUS_COLOR[status],
                            boxShadow: status === 'completed' ? '0 0 6px rgba(0,245,160,0.4)' :
                                       status === 'in_progress' ? '0 0 6px rgba(0,212,255,0.3)' : 'none',
                          }}
                          title={status.replace('_', ' ')}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6">
            {Object.entries({ completed: 'Completed', in_progress: 'In Progress', not_started: 'Not Started' }).map(([k, label]) => (
              <div key={k} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR[k] }} />
                <span className="font-inter text-[10px]" style={{ color: 'rgba(232,232,240,0.35)' }}>{label}</span>
              </div>
            ))}
            <p className="ml-auto font-inter text-[10px]" style={{ color: 'rgba(232,232,240,0.2)' }}>
              * Progress data coming in Phase 2 — showing placeholder view
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
