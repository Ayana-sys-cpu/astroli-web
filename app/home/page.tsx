'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '@/components/StarField';
import JourneyCard from '@/components/student/JourneyCard';
import StudentHeader from '@/components/StudentHeader';
import { getFirstName, saveFirstName } from '@/lib/student-store';
import { greetingLanguageForName } from '@/lib/display-name';
import { t, type Lang } from '@/lib/i18n';
import type { HomeJourney } from '@/lib/student-home';
import { readHomeCache, writeHomeCache } from '@/lib/home-cache';
import CuriosityPanel from './CuriosityPanel';

const HOME_CACHE_TTL = 10_000; // 10 s — fresh enough after /syncing navigation

function consumeHomeCache(): { journeys: HomeJourney[]; hasParent: boolean } | null {
  try {
    const raw = sessionStorage.getItem('astroli_home_cache');
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: any; ts: number };
    sessionStorage.removeItem('astroli_home_cache');
    if (Date.now() - ts > HOME_CACHE_TTL) return null;
    return { journeys: data.journeys ?? [], hasParent: !!data.hasParent };
  } catch {
    return null;
  }
}

export default function HomePage() {
  const router = useRouter();
  const [journeys, setJourneys] = useState<HomeJourney[] | null>(null);
  const [hasParent, setHasParent] = useState(false);
  const [firstName, setFirstName] = useState('');
  useEffect(() => { setFirstName(getFirstName()); }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/student/home');
      if (res.status === 401 || res.status === 403) { router.replace('/'); return; }
      const data = await res.json();
      const list: HomeJourney[] = data.journeys ?? [];
      const parent = !!data.hasParent;
      // The server is authoritative for the name — a correction made after this
      // student first signed in would otherwise never replace the cached copy.
      if (data.firstName) {
        setFirstName(data.firstName);
        saveFirstName(data.firstName);
      }
      setJourneys(list);
      setHasParent(parent);
      // Persist for instant paint on the next return to /home (SWR).
      writeHomeCache({ journeys: list, hasParent: parent });
    } catch {
      // stay — next focus/poll will retry
    }
  }, [router]);

  // On mount, in priority order (reading in useEffect, not during render,
  // avoids SSR/hydration mismatches):
  //  1. The /syncing prefetch cache — freshest (just fetched, <10s old); when
  //     present we paint it and skip the immediate refetch.
  //  2. Otherwise the persistent SWR cache — paint the last-known journeys
  //     instantly (no SYNCING skeleton on back-navigation), then revalidate.
  //  3. Otherwise a cold load.
  useEffect(() => {
    const fresh = consumeHomeCache();
    if (fresh) {
      setJourneys(fresh.journeys);
      setHasParent(fresh.hasParent);
      return;
    }
    const cached = readHomeCache();
    if (cached) {
      setJourneys(cached.journeys);
      setHasParent(cached.hasParent);
    }
    load(); // background revalidation (also the cold-load path)
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-check whenever the student returns to this tab — e.g. after the
  // teacher activates a mission or opens a new vote while this was idle.
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  // Page-level chrome follows the language of the student's journeys
  // (per-card copy already localizes via journey.language inside JourneyCard).
  const lang: Lang = journeys?.[0]?.language === 'he' ? 'he' : 'en';

  // The greeting is the exception: it sits directly against the student's name,
  // so it follows the name's script instead of the journey. Keeps "Welcome back,
  // Amir" and "ברוך שובך, נילי" whole rather than mixing scripts in one line.
  const greetingLang: Lang = greetingLanguageForName(firstName);

  const handleCardClick = (journey: HomeJourney) => {
    if (journey.status === 'idle') {
      if (journey.isFamilyClass) {
        router.push(`/family/missions?classId=${journey.classId}`);
      }
      return;
    }
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
      className="relative min-h-screen bg-black"
    >
      {/* Decoration is clipped here, not on the root — any overflow on an
          ancestor of the header cancels its sticky positioning. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <StarField count={130} seed={33} />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 15% -10%, rgba(123,47,190,0.12) 0%, transparent 55%), radial-gradient(ellipse at 90% 100%, rgba(0,245,212,0.07) 0%, transparent 55%)',
          }}
        />
      </div>

      <StudentHeader nav="home" store="full" storeOriginLabel="backHome" initials={firstName[0]?.toUpperCase() ?? 'A'} lang={lang} />

      <div className="relative z-10 px-5 sm:px-7 py-8 max-w-6xl mx-auto">
        <p className="font-caveat text-3xl text-white/80 mb-1" dir={greetingLang === 'he' ? 'rtl' : 'ltr'}>{t('welcomeBack', greetingLang).replace('{name}', firstName)}</p>
        <p className="text-[10px] tracking-[0.28em] font-space uppercase text-white/30 mb-8">
          {!journeys ? t('syncingJourneys', lang) : journeys.length === 0 ? t('journeyAwaits', lang) : journeys.length === 1 ? t('journeysCountOne', lang) : t('journeysCountMany', lang).replace('{n}', String(journeys.length))}
        </p>

        {/* Journeys and the curiosity panel are peers: side by side on a laptop,
            stacked on a phone. The panel loads on its own — journeys never wait. */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-10">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <p className="text-[10px] tracking-[0.3em] font-space uppercase text-white/35">{t('yourJourneys', lang)}</p>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {!journeys ? (
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="text-[10px] tracking-[0.3em] font-space uppercase text-white/40"
              >
                {t('syncingShort', lang)}
              </motion.div>
            ) : journeys.length === 0 ? (
              <EmptyJourneys hasParent={hasParent} />
            ) : (
              <div className="flex flex-wrap gap-5">
                <AnimatePresence>
                  {journeys.map((journey, i) => (
                    <motion.div
                      key={journey.classId}
                      className="w-full sm:w-3/4 lg:w-full"
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
          </section>

          <CuriosityPanel lang={lang} />
        </div>
      </div>
    </motion.div>
  );
}

const WA_MESSAGE = encodeURIComponent(
  "Hi! I'm a student on Astroli and I'm waiting for my Celestial Journey to be activated. Can you help me get started?"
);
const WA_URL = `https://wa.me/?text=${WA_MESSAGE}`;

// Matches JourneyCard's exact shape — same border-radius, gradient bg, badge/body/CTA anatomy —
// but ghosted and animated to signal "waiting for teacher to set up a journey".
function EmptyJourneys({ hasParent }: { hasParent: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative text-left rounded-[22px] p-6 w-full overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #1a1726 0%, #14121d 100%)',
        border: '1px solid rgba(160,32,240,0.28)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset, 0 0 36px rgba(160,32,240,0.10), 0 0 70px rgba(160,32,240,0.04)',
      }}
    >
      {/* Shimmer sweep — fires once on mount */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(105deg, transparent 30%, rgba(160,32,240,0.08) 50%, transparent 70%)',
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
      />

      {/* Header row: class placeholder + badge */}
      <div className="flex items-start justify-between mb-4">
        <div>
          {/* Skeleton class name line */}
          <motion.div
            className="h-2.5 rounded-full mb-2"
            style={{ width: 120, background: 'rgba(184,174,224,0.15)' }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <p className="font-bold text-lg tracking-[-0.01em]" style={{ color: 'rgba(255,255,255,0.18)' }}>
            {hasParent ? 'Your journey is being prepared' : 'Journey not yet assigned'}
          </p>
        </div>

        {/* Badge matching JourneyCard's pill style */}
        <motion.div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.16em] uppercase whitespace-nowrap"
          style={{
            color: '#cd9bff',
            background: 'rgba(160,32,240,0.13)',
            border: '1px solid rgba(160,32,240,0.32)',
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {hasParent ? 'ALMOST READY' : 'AWAITING SETUP'}
        </motion.div>
      </div>

      {/* Skeleton progress bar in place of live bar */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-[9.5px] font-bold tracking-[0.14em] uppercase" style={{ color: 'rgba(184,174,224,0.3)' }}>
            MISSION PROGRESS
          </span>
          <span className="text-[13px] font-bold" style={{ color: 'rgba(160,32,240,0.4)' }}>— / —</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          {/* Scanning pulse instead of a real fill */}
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(160,32,240,0.5), transparent)', width: '40%' }}
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.6 }}
          />
        </div>
      </div>

      {/* Body copy */}
      <p className="text-[12.5px] leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.38)' }}>
        {hasParent
          ? "The stars haven’t aligned yet, Traveller. Your parent is charting your first Celestial Journey — it will appear here the moment it’s ready. Go give them a nudge!"
          : "The stars haven’t aligned yet, Traveller. Your teacher is still preparing your Celestial Journey — it will appear here the moment it’s ready."}
      </p>

      {/* CTA row: WhatsApp — shown only for teacher-track students */}
      {!hasParent && (
        <motion.a
          href={WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 py-2.5 rounded-[10px] text-[11px] font-bold tracking-[0.12em] uppercase w-full"
          style={{
            background: 'rgba(37,211,102,0.09)',
            border: '1px solid rgba(37,211,102,0.32)',
            color: '#25D366',
            textDecoration: 'none',
          }}
          animate={{ boxShadow: ['0 0 0px rgba(37,211,102,0)', '0 0 18px rgba(37,211,102,0.22)', '0 0 0px rgba(37,211,102,0)'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ background: 'rgba(37,211,102,0.18)' } as any}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Message teacher on WhatsApp
        </motion.a>
      )}
    </motion.div>
  );
}
