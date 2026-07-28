'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import StarField from '@/components/StarField';
import SavedShelf, { type SavedTile } from './SavedShelf';
import SearchBar from './SearchBar';

function MasterHub() {
  const router = useRouter();
  // Set only when the student arrived from the home panel to ask something —
  // a plain visit to /master behaves exactly as before.
  const focusSearch = useSearchParams().get('focus') === 'search';
  const [saves, setSaves] = useState<SavedTile[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const [diveError, setDiveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/master/saves');
      if (res.status === 401 || res.status === 403) { router.replace('/'); return; }
      if (!res.ok) { setLoadFailed(true); setSaves([]); return; }
      const data = await res.json();
      setSaves(data.saves ?? []);
    } catch {
      setLoadFailed(true);
      setSaves([]);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/master/trending');
        if (!res.ok) return;
        const data = await res.json();
        setChips(data.chips ?? []);
      } catch {
        // Chips are a nicety — the search bar carries the screen without them.
      }
    })();
  }, []);

  const startDive = useCallback(async (body: Record<string, string>) => {
    if (starting) return;
    setStarting(true);
    setDiveError(null);
    try {
      const res = await fetch('/api/master/dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.session?.id) {
        router.push(`/master/dive/${data.session.id}`);
        return;
      }
      setDiveError(
        data?.error === 'orin_recharging'
          ? 'Orin is recharging. Try again in a moment.'
          : "That didn't start. Try again.",
      );
    } catch {
      setDiveError('Check your connection and try again.');
    } finally {
      setStarting(false);
    }
  }, [router, starting]);

  const removeSave = useCallback(async (save: SavedTile) => {
    setSaves((prev) => prev?.filter((s) => s.id !== save.id) ?? prev);
    try {
      await fetch(`/api/master/saves?id=${save.id}`, { method: 'DELETE' });
    } catch {
      load();
    }
  }, [load]);

  return (
    <main className="relative min-h-screen" style={{ background: 'var(--master-ink)' }}>
      <StarField count={90} seed={7} />

      <div className="relative mx-auto max-w-5xl px-6 py-6">
        <header className="mb-10 flex items-center justify-between">
          <span
            className="text-[15px] tracking-[0.14em] text-white"
            style={{ fontFamily: 'var(--font-space)', fontWeight: 700 }}
          >
            ASTROLI
          </span>
          <nav className="flex gap-5 text-[13px]" style={{ fontFamily: 'var(--font-space)' }}>
            <a href="/home" style={{ color: 'var(--master-text-muted)' }}>Home</a>
            <span style={{ color: 'var(--color-teal)', fontWeight: 700 }}>Master</span>
            <a href="/store" style={{ color: 'var(--master-text-muted)' }}>Store</a>
          </nav>
        </header>

        <SearchBar
          onSubmit={(topic) => startDive({ origin: 'search', topic })}
          busy={starting}
          autoFocus={focusSearch}
        />

        {chips.length > 0 && (
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => startDive({ origin: 'chip', topic: chip })}
                disabled={starting}
                className="rounded-full px-3 py-1 text-[11px] transition-colors hover:bg-white/5 disabled:opacity-40"
                style={{ background: 'var(--master-surface)', color: 'var(--master-text-secondary)' }}
              >
                #{chip}
              </button>
            ))}
          </div>
        )}

        {diveError && (
          <p className="mb-6 text-center text-[13px]" style={{ color: 'var(--master-text-secondary)' }}>
            {diveError}
          </p>
        )}

        <section>
          {saves !== null && saves.length > 0 && (
            <h2
              className="mb-3 text-[13px] text-white/80"
              style={{ fontFamily: 'var(--font-space)', fontWeight: 500 }}
            >
              Saved
            </h2>
          )}

          {saves === null ? (
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="shrink-0 animate-pulse bg-white/[0.04]"
                  style={{ width: 132, height: 220, borderRadius: 'var(--master-tile-radius)' }}
                />
              ))}
            </div>
          ) : saves.length > 0 ? (
            <SavedShelf
              saves={saves}
              onRemove={removeSave}
              onOpen={(save) =>
                save.kind === 'dive' && save.dive_session_id
                  ? router.push(`/master/dive/${save.dive_session_id}`)
                  : save.edit_id
                    ? startDive({ origin: 'edit', edit_id: save.edit_id })
                    : undefined
              }
            />
          ) : (
            <div className="py-10">
              <p className="text-[17px] text-white" style={{ fontFamily: 'var(--font-space)', fontWeight: 500 }}>
                {loadFailed ? 'Your saves are taking a moment' : 'Start collecting what sparks you'}
              </p>
              <p className="mt-2 max-w-md text-[14px] leading-relaxed" style={{ color: 'var(--master-text-secondary)' }}>
                {loadFailed
                  ? 'Check your connection and try again.'
                  : 'Tap Save on any edit in your feed and it lands here, ready to explore whenever you want.'}
              </p>
              <button
                type="button"
                onClick={() => (loadFailed ? load() : router.push('/home'))}
                className="mt-5 rounded-full border px-5 py-2 text-[13px] text-white transition-colors hover:bg-white/5"
                style={{ borderColor: 'var(--master-hairline)', fontFamily: 'var(--font-space)' }}
              >
                {loadFailed ? 'Try again' : 'Go to your feed'}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function MasterPage() {
  return (
    <Suspense>
      <MasterHub />
    </Suspense>
  );
}
