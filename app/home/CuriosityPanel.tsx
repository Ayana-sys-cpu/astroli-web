'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t, type Lang } from '@/lib/i18n';
import CuriosityEditCard, { type CuriosityEdit } from './CuriosityEditCard';
import CuriosityGhost from './CuriosityGhost';

const RETRY_MS = 1200;
const CACHE_KEY = 'astroli_curiosity_panel';

interface Cached { enabled: boolean; edit: CuriosityEdit | null }

/** Last answer, so a returning student sees the panel instantly and it revalidates behind them. */
function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cached) : null;
  } catch {
    return null;
  }
}

function writeCache(value: Cached) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // A full or blocked store just costs the next visit its head start.
  }
}

/**
 * The doorway into Master, sitting beside the student's journeys.
 *
 * A returning student sees the last edit immediately while a fresh one loads
 * behind it. A first-time student sees the card's own silhouette rather than a
 * hole in the screen. Either way the layout never jumps.
 */
export default function CuriosityPanel({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [edit, setEdit] = useState<CuriosityEdit | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [diveError, setDiveError] = useState<string | null>(null);

  // Paint the previous answer before the network is even asked. Also the only
  // thing that lets the panel show its loading shape: until a student is known
  // to have the panel, showing a ghost would flash a feature they cannot open.
  useEffect(() => {
    const cached = readCache();
    if (!cached) return;
    setEnabled(cached.enabled);
    setEdit(cached.edit);
    if (cached.edit || !cached.enabled) setLoading(false);
  }, []);

  // Once per page load — the edit never rotates while the student is here.
  //
  // Straight after sign-in the session cookie can lag the first render, so this
  // request comes back unauthorized and the panel would be hidden for the whole
  // visit. Retry a couple of times, and again when the student comes back to
  // the tab, until one attempt actually answers.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let settled = false;

    const attempt = async (): Promise<boolean> => {
      try {
        const res = await fetch('/api/master/spotlight');
        if (!res.ok || cancelled) return false;
        const data = await res.json();
        if (cancelled) return false;
        const fresh: Cached = { enabled: !!data.enabled, edit: data.edit ?? null };
        setEnabled(fresh.enabled);
        setEdit(fresh.edit);
        setLoading(false);
        writeCache(fresh);
        return true;
      } catch {
        return false;
      }
    };

    const run = async (retriesLeft: number) => {
      if (cancelled || settled) return;
      settled = await attempt();
      if (!settled && retriesLeft > 0 && !cancelled) {
        timer = setTimeout(() => run(retriesLeft - 1), RETRY_MS);
      }
    };

    const onFocus = () => { if (!settled) run(1); };

    run(2);
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const exploreThis = async () => {
    if (!edit || starting) return;
    setStarting(true);
    setDiveError(null);
    try {
      const res = await fetch('/api/master/dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: 'edit', edit_id: edit.id, defer: true }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.session?.id) {
        // Stay busy — we are leaving, and a second tap must not fire another dive.
        router.push(`/master/dive/${data.session.id}`);
        return;
      }
      setDiveError(data?.error === 'orin_recharging' ? t('orinRecharging', lang) : t('diveFailed', lang));
      setStarting(false);
    } catch {
      setDiveError(t('diveFailed', lang));
      setStarting(false);
    }
  };

  // Behind the flag the panel does not exist for this student — no label, no gap.
  if (!enabled) return null;

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-[10px] tracking-[0.3em] font-space uppercase text-white/35">
          {t('whileYoureHere', lang)}
        </p>
        <div className="flex-1 h-px bg-white/8" />
      </div>

      <div
        className="rounded-[12px] p-2.5"
        style={{
          background: 'linear-gradient(180deg, #150e2e 0%, #0b0818 100%)',
          border: '1px solid rgba(139,0,255,0.28)',
        }}
      >
        {edit ? (
          <CuriosityEditCard
            edit={edit}
            ctaLabel={t('exploreThis', lang)}
            busy={starting}
            onExplore={exploreThis}
          />
        ) : loading ? (
          <CuriosityGhost />
        ) : null}

        {diveError && (
          <p className="mt-2.5 text-center text-[12px] leading-relaxed text-white/55">{diveError}</p>
        )}

        <a
          href="/master?focus=search"
          className="block py-2.5 text-center text-[12.5px] font-space transition-opacity hover:opacity-80"
          style={{ color: '#00F5D4' }}
        >
          {t('exploreAnything', lang)}
        </a>
      </div>
    </section>
  );
}
