'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import StarField from '@/components/StarField';
import MissionPlanet from './MissionPlanet';
import WarpOverlay from './WarpOverlay';

type Mission = { id: string; title: string; state: string; order: number };
type Language = 'en' | 'he';

function worldsLabel(count: number): string {
  if (count === 1) return 'ONE WORLD AWAITS';
  if (count === 2) return 'TWO WORLDS AWAIT';
  if (count === 3) return 'THREE WORLDS AWAIT';
  if (count === 4) return 'FOUR WORLDS AWAIT';
  return 'FIVE WORLDS AWAIT';
}

export default function FamilyMissionsContent() {
  const router   = useRouter();
  const params   = useSearchParams();
  const classId  = params.get('classId') ?? '';

  const [missions,   setMissions]   = useState<Mission[] | null>(null);
  const [language,   setLanguage]   = useState<Language>('en');
  const [previewId,  setPreviewId]  = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [warping,    setWarping]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (!classId) { router.replace('/home'); return; }

    fetch(`/api/student/family-missions?classId=${classId}`)
      .then(r => r.json())
      .then(d => {
        if (d.missions) {
          setMissions(d.missions);
          if (d.language === 'he') setLanguage('he');
        } else {
          router.replace('/home');
        }
      })
      .catch(() => router.replace('/home'));
  }, [classId, router]);

  const handleActivate = useCallback(async (missionId: string) => {
    setActivating(missionId);
    setError(null);

    const res = await fetch('/api/student/mission-activate', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ classId, missionId }),
    });

    if (res.status === 409) {
      router.replace(`/landscape?classId=${classId}`);
      return;
    }

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Something went wrong. Please try again.');
      setActivating(null);
      return;
    }

    if (reducedMotion) {
      router.replace(`/landscape?classId=${classId}`);
    } else {
      setWarping(true);
      setTimeout(() => router.replace(`/landscape?classId=${classId}`), 820);
    }
  }, [classId, reducedMotion, router]);

  const handleSelect = useCallback((missionId: string) => {
    if (previewId !== missionId) {
      // First tap / hover-click on a new planet → preview only
      setPreviewId(missionId);
    } else {
      // Second tap on the already-previewed planet → launch
      handleActivate(missionId);
    }
  }, [previewId, handleActivate]);

  const availableMissions = (missions ?? [])
    .filter(m => m.state === 'locked' || m.state === 'active')
    .sort((a, b) => a.order - b.order);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen bg-black overflow-hidden"
    >
      <StarField count={100} seed={42} />

      {/* Nebula ambient glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 20% -10%, rgba(123,47,190,0.14) 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, rgba(0,245,212,0.07) 0%, transparent 55%)',
        }}
      />

      {/* Warp animation — covers everything */}
      <WarpOverlay active={warping} onComplete={() => {}} />

      <header className="relative z-10 flex items-center px-7 py-4 border-b border-white/8">
        <button
          onClick={() => router.push('/home')}
          className="font-space font-black text-sm tracking-[0.22em] gradient-wordmark"
          aria-label="Go to home"
        >
          ASTROLI
        </button>
      </header>

      <div className="relative z-10 flex flex-col items-center px-6 pt-10 pb-16 min-h-[calc(100vh-57px)]">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="text-center mb-12 md:mb-16"
        >
          <h1 className="font-caveat text-3xl md:text-4xl text-white/85 mb-1">
            Choose your destination
          </h1>
          {missions && availableMissions.length > 0 && (
            <p className="text-[10px] tracking-[0.3em] font-space uppercase text-white/30">
              {worldsLabel(availableMissions.length)}
            </p>
          )}
        </motion.div>

        {/* Planet grid */}
        {!missions ? (
          <motion.p
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="text-[10px] tracking-[0.3em] font-space uppercase text-white/40"
          >
            LOADING…
          </motion.p>
        ) : availableMissions.length === 0 ? (
          <p className="text-white/40 text-sm">No missions available yet.</p>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex items-end justify-center gap-8 md:gap-14 flex-wrap"
          >
            {availableMissions.map((mission, i) => (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.1, duration: 0.45 }}
              >
                <MissionPlanet
                  mission={mission}
                  language={language}
                  isPreview={previewId === mission.id}
                  isActivating={activating === mission.id}
                  showRing={availableMissions.length >= 3}
                  onSelect={handleSelect}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-sm text-red-400 text-center"
          >
            {error}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
