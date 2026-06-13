'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RosterStudent {
  studentId: string;
  name: string;
  statusLine: string;
}

interface AllStudentsPanelProps {
  students: RosterStudent[];
}

export default function AllStudentsPanel({ students }: AllStudentsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        borderTop: '1px solid rgba(26,26,46,0.08)',
        marginTop: 8,
        paddingTop: 16,
      }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="font-inter"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'rgba(26,26,46,0.4)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 12 }}>{expanded ? '↑' : '↓'}</span>
        {expanded
          ? 'Hide students ↑'
          : `See all ${students.length} students`}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {students.map(s => (
                <div
                  key={s.studentId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 4px',
                    borderBottom: '1px solid rgba(26,26,46,0.06)',
                  }}
                >
                  <span className="font-inter" style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 500 }}>
                    {s.name}
                  </span>
                  <span className="font-inter" style={{ fontSize: 13, color: 'rgba(26,26,46,0.4)' }}>
                    {s.statusLine}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
