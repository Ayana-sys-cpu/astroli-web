'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { type CourseRecord } from '@/lib/teacher-store';

const CURRICULUM_OPTIONS = [
  {
    id:      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    label:   'History · 8th Grade',
    emoji:   '🏰',
    tagline: 'Who Owns the Truth?',
    detail:  'Medieval power, faith, and identity — 3 missions',
  },
  {
    id:      '98581683-3601-48af-90cf-1ac5a6338b2b',
    label:   'Science · 7th Grade',
    emoji:   '⚗️',
    tagline: 'What Is Everything Made Of?',
    detail:  'Matter, energy, and life — 3 missions',
  },
  {
    id:      '4eb3c6fd-bf21-4264-81e4-3722eeaa6748',
    label:   'Science · 8th Grade',
    emoji:   '⚛️',
    tagline: 'What Holds the World Together?',
    detail:  'Atoms, forces, and living systems — 3 missions',
  },
  {
    id:      '9d49a5b6-3bd1-48d2-8e26-44b54e219389',
    label:   'Science · 9th Grade',
    emoji:   '🌍',
    tagline: 'What Is the Cost of Energy?',
    detail:  'Chemistry, genetics, and sustainability — 3 missions',
  },
] as const;

export default function ConnectState({
  courses,
  onConnected,
}: {
  courses: CourseRecord[];
  onConnected: () => void;
}) {
  const [selectedCourse,     setSelectedCourse]     = useState<string | null>(() => courses.length > 0 ? courses[0].id : null);
  const [selectedCurriculum, setSelectedCurriculum] = useState<string | null>(null);
  const [connecting,         setConnecting]         = useState(false);
  const [error,              setError]              = useState<string | null>(null);

  async function handleConnect() {
    const course = courses.find(c => c.id === selectedCourse);
    if (!course || !selectedCurriculum) return;
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/teacher/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courses:             [{ id: course.id, name: course.name }],
          curriculumJourneyId: selectedCurriculum,
        }),
      });
      if (!res.ok) throw new Error('Server error');
      onConnected();
    } catch {
      setError('Something went wrong. Please try again.');
      setConnecting(false);
    }
  }

  if (courses.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center mt-28 gap-4">
        <p className="font-space text-sm tracking-widest" style={{ color: 'rgba(26,26,46,0.4)' }}>NO CLASSROOMS DETECTED</p>
        <p className="font-inter text-xs text-center max-w-xs" style={{ color: 'rgba(26,26,46,0.35)' }}>
          Your Google Classroom courses couldn&apos;t be loaded. Sign out and sign back in to try again.
        </p>
        <button
          onClick={() => { if (typeof window !== 'undefined') { localStorage.clear(); window.location.href = '/'; } }}
          className="mt-2 px-5 py-2 rounded-lg font-space font-bold text-xs tracking-[0.12em]"
          style={{ background: 'rgba(124,58,237,0.12)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.3)' }}
        >
          SIGN OUT &amp; RETRY
        </button>
      </motion.div>
    );
  }

  const canConnect = selectedCourse !== null && selectedCurriculum !== null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="max-w-lg mx-auto mt-16">
      <div className="mb-8">
        <h2 className="font-space font-black tracking-[0.12em] mb-2" style={{ fontSize: 20, color: '#1a1a2e' }}>
          SET UP YOUR CLASS
        </h2>
        <p className="font-inter text-sm" style={{ color: 'rgba(26,26,46,0.45)' }}>
          Choose your Google Classroom and the curriculum that matches it. Your roster is pulled automatically — no manual entry needed.
        </p>
      </div>

      {/* Step 1 — Select classroom */}
      <div className="mb-7">
        <p className="font-space text-[10px] font-bold tracking-[0.2em] mb-3" style={{ color: 'rgba(26,26,46,0.3)' }}>
          STEP 1 · SELECT CLASSROOM
        </p>
        <div className="flex flex-col gap-3">
          {courses.map((course) => {
            const isSelected = selectedCourse === course.id;
            return (
              <button
                key={course.id}
                onClick={() => setSelectedCourse(course.id)}
                className="flex items-center gap-4 rounded-xl px-5 py-4 text-left transition-all"
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(0,212,255,0.04) 100%)'
                    : 'rgba(255,255,255,0.6)',
                  border: `1px solid ${isSelected ? 'rgba(124,58,237,0.4)' : 'rgba(26,26,46,0.08)'}`,
                  cursor: 'pointer',
                }}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${isSelected ? '#7C3AED' : 'rgba(26,26,46,0.2)'}`, background: isSelected ? 'rgba(124,58,237,0.12)' : 'transparent' }}
                >
                  {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C3AED' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-space font-bold text-sm truncate" style={{ color: '#1a1a2e' }}>
                    {course.name}
                  </p>
                  {course.section && (
                    <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(26,26,46,0.35)' }}>{course.section}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 — Select curriculum */}
      <div className="mb-8">
        <p className="font-space text-[10px] font-bold tracking-[0.2em] mb-3" style={{ color: 'rgba(26,26,46,0.3)' }}>
          STEP 2 · SELECT CURRICULUM
        </p>
        <div className="flex flex-col gap-3">
          {CURRICULUM_OPTIONS.map(option => {
            const isSelected = selectedCurriculum === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setSelectedCurriculum(option.id)}
                className="flex items-center gap-4 rounded-xl px-5 py-4 text-left transition-all"
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(0,212,255,0.04) 100%)'
                    : 'rgba(255,255,255,0.6)',
                  border: `1px solid ${isSelected ? 'rgba(124,58,237,0.4)' : 'rgba(26,26,46,0.08)'}`,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{option.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-space font-bold text-sm" style={{ color: '#1a1a2e' }}>
                    {option.label}
                  </p>
                  <p className="font-inter text-xs mt-0.5" style={{ color: isSelected ? '#7C3AED' : 'rgba(26,26,46,0.4)' }}>
                    {option.tagline} · {option.detail}
                  </p>
                </div>
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${isSelected ? '#7C3AED' : 'rgba(26,26,46,0.2)'}`, background: isSelected ? 'rgba(124,58,237,0.12)' : 'transparent' }}
                >
                  {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C3AED' }} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <motion.button
        onClick={handleConnect}
        disabled={connecting || !canConnect}
        whileHover={!connecting && canConnect ? { scale: 1.02 } : undefined}
        whileTap={!connecting && canConnect ? { scale: 0.97 } : undefined}
        className="w-full py-3 rounded-xl font-space font-bold text-sm tracking-[0.12em]"
        style={{
          background: canConnect ? 'linear-gradient(120deg, #FF0080, #8B00FF)' : 'rgba(26,26,46,0.05)',
          color: canConnect ? '#fff' : 'rgba(26,26,46,0.25)',
          border: `1px solid ${canConnect ? 'transparent' : 'rgba(26,26,46,0.08)'}`,
          cursor: connecting || !canConnect ? 'default' : 'pointer',
          boxShadow: canConnect ? '0 4px 18px rgba(139,0,255,0.25)' : 'none',
        }}
      >
        {connecting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            CREATING YOUR JOURNEY…
          </span>
        ) : 'SYNC & CREATE JOURNEY →'}
      </motion.button>

      {!canConnect && !connecting && (
        <p className="font-inter text-[11px] text-center mt-3" style={{ color: 'rgba(26,26,46,0.3)' }}>
          Select a classroom and a curriculum to continue
        </p>
      )}

      {error && (
        <p className="font-inter text-xs text-center mt-4" style={{ color: '#DC2626' }}>{error}</p>
      )}
    </motion.div>
  );
}
