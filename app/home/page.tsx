'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import JourneyCard from '@/components/student/JourneyCard';
import { getAlienName, getBaseAvatarUrl, getInterest, generateAlienName, clearSession } from '@/lib/student-store';
import { supabaseSignOut } from '@/lib/session';
import type { HomeJourney } from '@/lib/student-home';

export default function HomePage() {
  const router = useRouter();
  const [journeys, setJourneys] = useState<HomeJourney[] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [alienName] = useState(() => getAlienName() || generateAlienName(getInterest() || 'traveller'));
  const [avatarUrl] = useState(() => getBaseAvatarUrl());

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/student/home');
      if (res.status === 401 || res.status === 403) { router.replace('/'); return; }
      const data = await res.json();
      const list: HomeJourney[] = data.journeys ?? [];
      if (list.length === 0) { router.replace('/pending-journey'); return; }
      setJourneys(list);
    } catch {
      // stay — next focus/poll will retry
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // Re-check whenever the student returns to this tab — e.g. after the
  // teacher activates a mission or opens a new vote while this was idle.
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleSignOut = () => {
    clearSession();
    supabaseSignOut().catch(() => {});
    router.push('/');
  };

  const handleCardClick = (journey: HomeJourney) => {
    if (journey.status === 'idle') return;
    if (journey.status === 'live' || journey.status === 'done') {
      router.push(`/landscape?classId=${journey.classId}`);
    } else {
      router.push(`/vote?classId=${journey.classId}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative min-h-screen bg-black overflow-hidden"
    >
      <StarField count={130} seed={33} />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 15% -10%, rgba(123,47,190,0.12) 0%, transparent 55%), radial-gradient(ellipse at 90% 100%, rgba(0,245,212,0.07) 0%, transparent 55%)',
        }}
      />

      <header className="relative z-10 flex items-center gap-4 px-7 py-4 border-b border-white/8">
        <span className="font-space font-black text-sm tracking-[0.22em] gradient-wordmark">ASTROLI</span>
        <div className="flex-1" />
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div
              className="w-[34px] h-[34px] rounded-full overflow-hidden flex-shrink-0"
              style={{ border: '1.5px solid rgba(0,245,212,0.4)' }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt={alienName} className="w-full h-full object-cover" />
                : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1d0033, #06000f)' }} />}
            </div>
            <div className="flex flex-col items-start">
              <span className="font-space font-bold text-xs tracking-[0.08em] text-white uppercase">{alienName}</span>
              <span className="text-[9px] text-white/35 tracking-[0.1em] uppercase">Traveller</span>
            </div>
          </button>

          {menuOpen && (
            <div
              className="absolute top-12 right-0 w-40 rounded-lg overflow-hidden z-50"
              style={{ background: 'rgba(0,10,18,0.95)', border: '1px solid rgba(0,196,204,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
            >
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-3 text-left text-[11px] tracking-[0.15em] font-space text-white/60 hover:text-white hover:bg-white/5 transition-colors uppercase"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 px-7 py-8 max-w-4xl mx-auto">
        <p className="font-caveat text-3xl text-white/80 mb-1">Welcome back, {alienName}.</p>
        <p className="text-[10px] tracking-[0.28em] font-space uppercase text-white/30 mb-8">
          {journeys ? `YOU HAVE ${journeys.length} JOURNEY${journeys.length === 1 ? '' : 'S'} ACROSS THE STARS` : 'SYNCING YOUR JOURNEYS…'}
        </p>

        <div className="flex items-center gap-3 mb-4">
          <p className="text-[10px] tracking-[0.3em] font-space uppercase text-white/35">YOUR JOURNEYS</p>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        {!journeys ? (
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="text-[10px] tracking-[0.3em] font-space uppercase text-white/40"
          >
            SYNCING…
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <AnimatePresence>
              {journeys.map((journey, i) => (
                <motion.div
                  key={journey.classId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <JourneyCard journey={journey} onClick={() => handleCardClick(journey)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
