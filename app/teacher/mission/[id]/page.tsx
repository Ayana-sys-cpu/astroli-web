'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Planet {
  id: string;
  title: string;
  content: string;
  openingMessage: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
}

interface Mission {
  id: string;
  question: string;
  questionDescription: string | null;
  projectTitle: string;
  projectDescription: string | null;
  openingMessage: string | null;
  status: string;
  order: number;
  planets: Planet[];
}

export default function MissionReview() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [briefOpen, setBriefOpen] = useState(false);
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/teacher/missions?id=${id}`)
      .then(r => r.json())
      .then(d => { setMission(d.mission); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <span className="w-5 h-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
        <span className="font-space text-xs tracking-widest" style={{ color: 'rgba(26,26,46,0.3)' }}>LOADING MISSION…</span>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="font-space text-sm tracking-widest" style={{ color: 'rgba(26,26,46,0.3)' }}>MISSION NOT FOUND</p>
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-8 font-space text-[11px] tracking-widest transition-colors"
        style={{ color: 'rgba(26,26,46,0.35)' }}
      >
        ← MISSION CONTROL
      </button>

      {/* Mission header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="font-space text-[10px] font-bold tracking-[0.2em] px-2.5 py-1 rounded"
            style={{ background: 'rgba(14,165,233,0.1)', color: '#0369A1', border: '1px solid rgba(14,165,233,0.25)' }}
          >
            MISSION {String(mission.order).padStart(2, '0')} · LIVE
          </span>
        </div>
        <h1
          className="font-space font-black leading-tight mb-2"
          style={{ fontSize: 26, color: '#1a1a2e' }}
        >
          {mission.question}
        </h1>
        {mission.questionDescription && (
          <p className="font-inter text-sm max-w-2xl" style={{ color: 'rgba(26,26,46,0.5)' }}>
            {mission.questionDescription}
          </p>
        )}
      </motion.div>

      <div className="grid grid-cols-[1fr_360px] gap-6">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-5">
          {/* Project card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-panel"
            style={{ padding: 24, borderColor: 'rgba(139,0,255,0.2)' }}
          >
            <p className="font-space text-[10px] tracking-[0.2em] mb-2" style={{ color: '#8B00FF' }}>
              STUDENT PROJECT
            </p>
            <h2 className="font-space font-bold text-base mb-2" style={{ color: '#1a1a2e' }}>
              {mission.projectTitle}
            </h2>
            {mission.projectDescription && (
              <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(26,26,46,0.5)' }}>
                {mission.projectDescription}
              </p>
            )}
          </motion.div>

          {/* Project Brief (collapsible) */}
          {mission.openingMessage && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setBriefOpen(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
                style={{ background: 'rgba(255,255,255,0.3)' }}
              >
                <span className="font-space text-[11px] font-bold tracking-[0.15em]" style={{ color: 'rgba(26,26,46,0.55)' }}>
                  PIP BOT OPENING MESSAGE
                </span>
                <span
                  className="text-lg transition-transform duration-200"
                  style={{ color: 'rgba(26,26,46,0.3)', transform: briefOpen ? 'rotate(180deg)' : 'none' }}
                >
                  ›
                </span>
              </button>
              <AnimatePresence initial={false}>
                {briefOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="px-6 pb-5 pt-2">
                      <p className="font-inter text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(26,26,46,0.5)' }}>
                        {mission.openingMessage}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Planets grid */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <p className="font-space text-[10px] tracking-[0.2em] mb-3" style={{ color: 'rgba(26,26,46,0.35)' }}>
              PLANETS · {mission.planets.length} KNOWLEDGE STOPS
            </p>
            <div className="grid grid-cols-2 gap-3">
              {mission.planets.map((planet, pi) => (
                <motion.button
                  key={planet.id}
                  onClick={() => setSelectedPlanet(planet)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="glass-card text-left p-4 relative overflow-hidden"
                >
                  <span
                    className="absolute top-3 right-3 font-space text-[10px] font-bold"
                    style={{ color: 'rgba(26,26,46,0.15)' }}
                  >
                    {String(pi + 1).padStart(2, '0')}
                  </span>
                  <p className="font-space font-bold text-xs leading-snug pr-6" style={{ color: '#1a1a2e' }}>
                    {planet.title}
                  </p>
                  <p className="font-inter text-[11px] mt-1.5 line-clamp-2" style={{ color: 'rgba(26,26,46,0.4)' }}>
                    {planet.content.slice(0, 90)}…
                  </p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Sidebar ── */}
        <div className="flex flex-col gap-5">
          {/* Mission status controls */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel"
            style={{ padding: 20, borderColor: 'rgba(14,165,233,0.25)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span
                className="w-2 h-2 rounded-full animate-pulse breathe"
                style={{ background: '#0EA5E9', boxShadow: '0 0 8px #0EA5E9' }}
              />
              <span className="font-space text-xs font-bold tracking-widest" style={{ color: '#0369A1' }}>MISSION LIVE</span>
            </div>
            <p className="font-inter text-xs mb-4" style={{ color: 'rgba(26,26,46,0.45)' }}>
              Students can access this mission now. All planets are unlocked for navigation.
            </p>
            <button
              onClick={async () => {
                await fetch('/api/teacher/missions', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ missionId: mission.id, state: 'completed' }),
                });
                router.push('/teacher');
              }}
              className="w-full py-2.5 rounded-lg font-space text-[11px] font-bold tracking-[0.12em]"
              style={{ background: 'rgba(26,26,46,0.05)', color: 'rgba(26,26,46,0.45)', border: '1px solid rgba(26,26,46,0.1)' }}
            >
              CLOSE MISSION
            </button>
          </motion.div>

          {/* Planet detail preview */}
          <AnimatePresence mode="wait">
            {selectedPlanet ? (
              <motion.div
                key={selectedPlanet.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="glass-card p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-space font-bold text-sm" style={{ color: '#1a1a2e' }}>
                    {selectedPlanet.title}
                  </p>
                  <button
                    onClick={() => setSelectedPlanet(null)}
                    className="text-lg leading-none"
                    style={{ color: 'rgba(26,26,46,0.3)' }}
                  >
                    ×
                  </button>
                </div>
                <p className="font-inter text-xs leading-relaxed" style={{ color: 'rgba(26,26,46,0.5)' }}>
                  {selectedPlanet.content}
                </p>
                {selectedPlanet.openingMessage && (
                  <div
                    className="rounded-lg p-3 mt-1"
                    style={{ background: 'rgba(139,0,255,0.06)', border: '1px solid rgba(139,0,255,0.15)' }}
                  >
                    <p className="font-space text-[9px] tracking-widest mb-1.5" style={{ color: '#8B00FF' }}>PIP BOT</p>
                    <p className="font-inter text-xs leading-relaxed italic" style={{ color: 'rgba(26,26,46,0.5)' }}>
                      "{selectedPlanet.openingMessage}"
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl p-5 flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.4)', border: '1px dashed rgba(139,0,255,0.2)', minHeight: 120 }}
              >
                <p className="font-space text-[10px] tracking-widest text-center" style={{ color: 'rgba(26,26,46,0.25)' }}>
                  CLICK A PLANET<br />TO PREVIEW CONTENT
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
