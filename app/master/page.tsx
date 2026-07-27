'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import SavedShelf, { type SavedTile } from './SavedShelf';

export default function MasterPage() {
  const router = useRouter();
  const [saves, setSaves] = useState<SavedTile[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

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
            <SavedShelf saves={saves} onRemove={removeSave} />
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
