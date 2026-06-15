'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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

interface PlanetPreview {
  id: string;
  title: string;
  content: string;
  openingMessage: string | null;
}

interface MissionPreview {
  id: string;
  order: number;
  question: string;
  questionDescription: string | null;
  projectTitle: string;
  projectDescription: string | null;
  planets: PlanetPreview[];
}

type JourneyDetails = MissionPreview[] | 'loading' | 'error';

export default function ConnectState({
  courses,
  onConnected,
}: {
  courses: CourseRecord[];
  onConnected: () => void;
}) {
  const router = useRouter();
  const [selectedCourse,     setSelectedCourse]     = useState<string | null>(() => courses.length > 0 ? courses[0].id : null);
  const [selectedCurriculum, setSelectedCurriculum] = useState<string | null>(null);
  const [connecting,         setConnecting]         = useState(false);
  const [error,              setError]              = useState<string | null>(null);
  const [journeyDetails,     setJourneyDetails]     = useState<Record<string, JourneyDetails>>({});
  const [expandedMission,    setExpandedMission]    = useState<string | null>(null);

  async function fetchJourneyDetails(journeyId: string) {
    if (journeyDetails[journeyId]) return;
    setJourneyDetails(prev => ({ ...prev, [journeyId]: 'loading' }));
    try {
      const res = await fetch(`/api/curriculum?id=${journeyId}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setJourneyDetails(prev => ({ ...prev, [journeyId]: data.missions }));
    } catch {
      setJourneyDetails(prev => ({ ...prev, [journeyId]: 'error' }));
    }
  }

  function handleSelectCurriculum(id: string) {
    const isDeselecting = selectedCurriculum === id;
    setSelectedCurriculum(isDeselecting ? null : id);
    setExpandedMission(null);
    if (!isDeselecting) fetchJourneyDetails(id);
  }

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
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="max-w-2xl mx-auto mt-12">

      {/* Step 1 — Select classroom */}
      <div className="mb-10">
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
                  background: isSelected ? 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(0,212,255,0.04) 100%)' : 'rgba(255,255,255,0.6)',
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
                  <p className="font-space font-bold text-sm truncate" style={{ color: '#1a1a2e' }}>{course.name}</p>
                  {course.section && (
                    <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(26,26,46,0.35)' }}>{course.section}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 — Link to journey */}
      <div className="mb-8">
        <p className="font-space text-[10px] font-bold tracking-[0.2em] mb-1" style={{ color: 'rgba(26,26,46,0.3)' }}>
          STEP 2 · LINK TO JOURNEY
        </p>
        <p className="font-inter text-xs mb-4" style={{ color: 'rgba(26,26,46,0.4)', lineHeight: 1.6 }}>
          A journey is a series of missions built around a big question. In each mission, students explore knowledge stops called planets — guided by a character bot — and apply what they discover to a real project.
        </p>

        <div className="flex flex-col gap-3">
          {CURRICULUM_OPTIONS.map(option => {
            const isSelected = selectedCurriculum === option.id;
            const details    = journeyDetails[option.id];
            const missions   = Array.isArray(details) ? details : null;

            return (
              <div
                key={option.id}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  background: isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)',
                  border: `1.5px solid ${isSelected ? 'rgba(124,58,237,0.45)' : 'rgba(26,26,46,0.09)'}`,
                }}
              >
                {/* Journey header — always visible */}
                <button
                  onClick={() => handleSelectCurriculum(option.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all"
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${isSelected ? '#7C3AED' : 'rgba(26,26,46,0.2)'}`, background: isSelected ? 'rgba(124,58,237,0.12)' : 'transparent' }}
                  >
                    {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C3AED' }} />}
                  </div>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{option.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-space font-bold text-sm" style={{ color: '#1a1a2e' }}>{option.label}</p>
                    <p className="font-inter text-xs mt-0.5" style={{ color: isSelected ? '#7C3AED' : 'rgba(26,26,46,0.4)' }}>
                      {option.tagline} · {option.detail}
                    </p>
                  </div>
                  <span style={{ fontSize: 16, color: 'rgba(26,26,46,0.3)', flexShrink: 0, transform: isSelected ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
                </button>

                {/* Expanded: missions */}
                <AnimatePresence initial={false}>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: 'hidden', borderTop: '1px solid rgba(124,58,237,0.12)' }}
                    >
                      <div style={{ padding: '14px 18px 18px' }}>
                        <p className="font-space font-bold text-[10px] tracking-[0.18em] mb-3" style={{ color: 'rgba(26,26,46,0.3)' }}>
                          MISSIONS IN THIS JOURNEY
                        </p>

                        {details === 'loading' && (
                          <div className="flex items-center gap-2 py-4">
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin" />
                            <span className="font-space text-[10px] tracking-widest" style={{ color: 'rgba(26,26,46,0.3)' }}>LOADING MISSIONS…</span>
                          </div>
                        )}

                        {details === 'error' && (
                          <p className="font-inter text-xs py-2" style={{ color: '#DC2626' }}>Failed to load mission details. Please try again.</p>
                        )}

                        {missions && (
                          <div className="flex flex-col gap-2">
                            {missions.map(mission => {
                              const mOpen = expandedMission === mission.id;
                              return (
                                <div
                                  key={mission.id}
                                  className="rounded-xl overflow-hidden"
                                  style={{
                                    background: mOpen ? 'rgba(124,58,237,0.05)' : 'rgba(26,26,46,0.025)',
                                    border: `1px solid ${mOpen ? 'rgba(124,58,237,0.25)' : 'rgba(26,26,46,0.07)'}`,
                                  }}
                                >
                                  {/* Mission header */}
                                  <button
                                    onClick={() => setExpandedMission(mOpen ? null : mission.id)}
                                    className="w-full flex items-start gap-3 px-4 py-3 text-left"
                                  >
                                    <span className="font-space font-bold text-[10px] tracking-[0.1em] flex-shrink-0 pt-0.5" style={{ color: mOpen ? '#7C3AED' : 'rgba(26,26,46,0.3)' }}>
                                      M{String(mission.order).padStart(2, '0')}
                                    </span>
                                    <p className="flex-1 font-space font-bold text-sm leading-snug" style={{ color: '#1a1a2e' }}>
                                      {mission.question}
                                    </p>
                                    <span style={{ fontSize: 15, color: 'rgba(26,26,46,0.25)', flexShrink: 0, transform: mOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginTop: 2 }}>›</span>
                                  </button>

                                  {/* Mission body */}
                                  <AnimatePresence initial={false}>
                                    {mOpen && (
                                      <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        exit={{ height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ overflow: 'hidden' }}
                                      >
                                        <div style={{ padding: '0 16px 16px 36px' }}>

                                          {/* What students do */}
                                          {mission.questionDescription && (
                                            <p className="font-inter text-xs mb-3" style={{ color: 'rgba(26,26,46,0.55)', lineHeight: 1.65 }}>
                                              {mission.questionDescription}
                                            </p>
                                          )}

                                          {/* How they learn */}
                                          <div className="mb-3 rounded-lg px-3 py-2.5" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                                            <p className="font-space font-bold text-[9px] tracking-[0.15em] mb-1" style={{ color: '#7C3AED' }}>HOW STUDENTS LEARN</p>
                                            <p className="font-inter text-[11px]" style={{ color: 'rgba(26,26,46,0.5)', lineHeight: 1.6 }}>
                                              Students explore each planet by chatting with a character bot embedded in the time period or concept. They ask questions, get challenged, and form their own understanding before moving to the next planet.
                                            </p>
                                          </div>

                                          {/* Planet list */}
                                          {mission.planets.length > 0 && (
                                            <>
                                              <p className="font-space font-bold text-[9px] tracking-[0.15em] mb-2" style={{ color: 'rgba(26,26,46,0.3)' }}>
                                                PLANETS · {mission.planets.length} KNOWLEDGE STOPS
                                              </p>
                                              <div className="grid grid-cols-2 gap-1.5 mb-3">
                                                {mission.planets.map((planet, pi) => (
                                                  <div
                                                    key={planet.id}
                                                    className="flex items-start gap-2 rounded-lg px-3 py-2"
                                                    style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(26,26,46,0.07)' }}
                                                  >
                                                    <span className="font-space font-bold text-[9px] flex-shrink-0 pt-0.5" style={{ color: 'rgba(26,26,46,0.2)' }}>
                                                      {String(pi + 1).padStart(2, '0')}
                                                    </span>
                                                    <span className="font-space font-bold text-[11px] leading-snug" style={{ color: '#1a1a2e' }}>
                                                      {planet.title}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            </>
                                          )}

                                          {/* Preview button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              router.push(`/teacher/mission/${mission.id}`);
                                            }}
                                            className="flex items-center gap-2 font-space font-bold text-[10px] tracking-[0.08em] px-3 py-2 rounded-lg transition-all"
                                            style={{ background: 'rgba(26,26,46,0.05)', border: '1px solid rgba(26,26,46,0.12)', color: 'rgba(26,26,46,0.55)', cursor: 'pointer' }}
                                          >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                            </svg>
                                            Preview from student view
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                                            </svg>
                                          </button>

                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
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
          Select a classroom and link a journey to continue
        </p>
      )}

      {error && (
        <p className="font-inter text-xs text-center mt-4" style={{ color: '#DC2626' }}>{error}</p>
      )}
    </motion.div>
  );
}
