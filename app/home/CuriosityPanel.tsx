'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t, type Lang } from '@/lib/i18n';
import CuriosityEditCard, { type CuriosityEdit } from './CuriosityEditCard';

const RETRY_MS = 1200;

/**
 * The doorway into Master, sitting beside the student's journeys.
 *
 * Loading, empty and failed all render the same thing — the invitation alone.
 * A student with no live content still gets a complete screen, and there is no
 * skeleton flash or layout jump when an edit does arrive.
 */
export default function CuriosityPanel({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [edit, setEdit] = useState<CuriosityEdit | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [starting, setStarting] = useState(false);
  const [diveError, setDiveError] = useState<string | null>(null);

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
        setEnabled(!!data.enabled);
        setEdit(data.edit ?? null);
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
        body: JSON.stringify({ origin: 'edit', edit_id: edit.id }),
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
        {edit && (
          <CuriosityEditCard
            edit={edit}
            ctaLabel={t('exploreThis', lang)}
            busy={starting}
            onExplore={exploreThis}
          />
        )}

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
