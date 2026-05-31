'use client';
import { motion, AnimatePresence } from 'framer-motion';

interface Planet {
  id: string;
  title: string;
}

export interface PreviewMission {
  question: string;
  questionDescription?: string | null;
  projectTitle: string;
  order: number;
  planets?: Planet[];
}

interface StudentMobilePreviewProps {
  mission: PreviewMission | null;
  onClose: () => void;
}

export default function StudentMobilePreview({ mission, onClose }: StudentMobilePreviewProps) {
  return (
    <AnimatePresence>
      {mission && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col overflow-hidden"
            style={{
              width: 320, maxHeight: '86vh',
              background: '#0A0A0F',
              borderRadius: 28,
              border: '2px solid rgba(232,232,240,0.1)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Notch */}
            <div className="flex items-center justify-center py-3" style={{ background: 'rgba(232,232,240,0.03)' }}>
              <div style={{ width: 72, height: 5, borderRadius: 3, background: 'rgba(232,232,240,0.12)' }} />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4" style={{ paddingTop: 16 }}>
              <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(0,212,255,0.08))', border: '1px solid rgba(124,58,237,0.3)' }}>
                <p className="font-space font-black text-base mb-1" style={{ color: '#E8E8F0' }}>
                  {mission.projectTitle}
                </p>
                <p className="font-inter text-xs mb-3" style={{ color: 'rgba(232,232,240,0.45)' }}>
                  Mission option {mission.order}
                </p>
                {mission.questionDescription && (
                  <p className="font-inter text-xs leading-relaxed text-left" style={{ color: 'rgba(232,232,240,0.5)', borderTop: '1px solid rgba(124,58,237,0.2)', paddingTop: 12 }}>
                    {mission.questionDescription}
                  </p>
                )}
              </div>

              <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(232,232,240,0.03)', border: '1px solid rgba(232,232,240,0.07)' }}>
                <p className="font-space text-[9px] tracking-[0.2em] mb-1.5" style={{ color: 'rgba(232,232,240,0.35)' }}>BIG QUESTION</p>
                <p className="font-space font-bold text-sm leading-snug" style={{ color: '#E8E8F0' }}>{mission.question}</p>
              </div>

              {mission.planets && mission.planets.length > 0 && (
                <div>
                  <p className="font-space text-[9px] tracking-[0.2em] mb-2" style={{ color: 'rgba(232,232,240,0.3)' }}>
                    YOUR PLANETS TO EXPLORE
                  </p>
                  <div className="flex flex-col gap-2">
                    {mission.planets.map((planet, pi) => (
                      <div
                        key={planet.id}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                        style={{ background: 'rgba(232,232,240,0.03)', border: '1px solid rgba(232,232,240,0.07)', opacity: pi === 0 ? 1 : 0.45 }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: pi === 0 ? 'rgba(124,58,237,0.3)' : 'rgba(232,232,240,0.05)', border: `1px solid ${pi === 0 ? 'rgba(124,58,237,0.5)' : 'rgba(232,232,240,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: pi === 0 ? '#A78BFA' : 'rgba(232,232,240,0.3)' }}>🪐</span>
                        </div>
                        <p className="font-space font-bold text-xs" style={{ color: pi === 0 ? '#E8E8F0' : 'rgba(232,232,240,0.4)' }}>{planet.title}</p>
                        {pi === 0 && (
                          <span className="ml-auto font-space text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.3)' }}>
                            START
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-4 flex flex-col gap-2 items-center" style={{ background: 'rgba(232,232,240,0.02)', borderTop: '1px solid rgba(232,232,240,0.07)' }}>
              <p className="font-space text-[9px] tracking-[0.15em]" style={{ color: 'rgba(232,232,240,0.25)' }}>
                👩‍🎓 STUDENT MOBILE VIEW — PREVIEW ONLY
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg font-space text-[10px] font-bold tracking-[0.1em]"
                style={{ background: 'rgba(232,232,240,0.05)', color: 'rgba(232,232,240,0.5)', border: '1px solid rgba(232,232,240,0.1)' }}
              >
                CLOSE PREVIEW
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
