'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import StarField from '@/components/StarField';

type Mission = { id: string; title: string; state: string; order: number };

export default function FamilyMissionsContent() {
  const router  = useRouter();
  const params  = useSearchParams();
  const classId = params.get('classId') ?? '';

  const [missions,   setMissions]   = useState<Mission[] | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (!classId) { router.replace('/home'); return; }

    fetch(`/api/student/family-missions?classId=${classId}`)
      .then(r => r.json())
      .then(d => {
        if (d.missions) setMissions(d.missions);
        else router.replace('/home');
      })
      .catch(() => router.replace('/home'));
  }, [classId, router]);

  async function handleActivate(missionId: string) {
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

    router.replace(`/landscape?classId=${classId}`);
  }

  const availableMissions = (missions ?? []).filter(m => m.state === 'locked' || m.state === 'active');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen bg-black overflow-hidden"
    >
      <StarField count={100} seed={42} />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 20% -10%, rgba(123,47,190,0.12) 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, rgba(0,245,212,0.07) 0%, transparent 55%)',
        }}
      />

      <header className="relative z-10 flex items-center px-7 py-4 border-b border-white/8">
        <button
          onClick={() => router.push('/home')}
          className="font-space font-black text-sm tracking-[0.22em] gradient-wordmark"
          aria-label="Go to home"
        >
          ASTROLI
        </button>
      </header>

      <div className="relative z-10 px-7 py-8 max-w-2xl mx-auto">
        <h1 className="font-caveat text-3xl text-white/80 mb-1">Choose your mission</h1>
        <p className="text-[10px] tracking-[0.28em] font-space uppercase text-white/30 mb-8">
          Pick a mission to start exploring
        </p>

        {!missions ? (
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="text-[10px] tracking-[0.3em] font-space uppercase text-white/40"
          >
            LOADING…
          </motion.div>
        ) : availableMissions.length === 0 ? (
          <p className="text-white/40 text-sm">No missions available yet.</p>
        ) : (
          <div className="space-y-3">
            {availableMissions.map((mission, i) => (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="relative rounded-[18px] p-5 cursor-pointer group"
                style={{
                  background: 'linear-gradient(145deg, #1a1726 0%, #14121d 100%)',
                  border: '1px solid rgba(160,32,240,0.22)',
                }}
                onClick={() => !activating && handleActivate(mission.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(mission.id); } }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] tracking-[0.22em] font-space uppercase text-white/30 mb-1">
                      Mission {mission.order ?? i + 1}
                    </p>
                    <p className="text-white/85 font-medium text-sm leading-snug">{mission.title}</p>
                  </div>

                  <motion.button
                    className="flex-shrink-0 px-4 py-2 rounded-[10px] text-[11px] font-bold tracking-[0.12em] uppercase"
                    style={{
                      background: activating === mission.id ? 'rgba(160,32,240,0.25)' : 'rgba(160,32,240,0.13)',
                      border: '1px solid rgba(160,32,240,0.4)',
                      color: '#cd9bff',
                    }}
                    whileHover={!activating ? { background: 'rgba(160,32,240,0.25)' } as any : {}}
                    disabled={!!activating}
                  >
                    {activating === mission.id ? 'Starting…' : 'Start'}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}
      </div>
    </motion.div>
  );
}
