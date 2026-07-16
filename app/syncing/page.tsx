'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConstellationLoader from '@/components/ConstellationLoader';

export default function SyncingPage() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    // Race: wait for the animation (3.2s) AND the home data fetch, then route.
    // We pre-fetch /api/student/home here so /home can render immediately
    // without a second loading state — one animation covers the full load.
    const delay = new Promise<void>((res) => setTimeout(res, 3200));
    const homeCheck = fetch('/api/student/home')
      .then((r) => {
        if (r.status === 401 || r.status === 403) return { __redirect: '/' };
        return r.json();
      })
      .catch(() => null); // null = network error; don't cache so /home fetches fresh

    Promise.all([delay, homeCheck]).then(([, data]) => {
      if (!alive) return;
      if ((data as any)?.__redirect) { router.replace((data as any).__redirect); return; }
      // Only cache a real response — caching {} on error would show hasParent:false
      // on /home even when the parent_child_link exists in the DB.
      if (data) {
        try {
          sessionStorage.setItem('astroli_home_cache', JSON.stringify({ data, ts: Date.now() }));
        } catch { /* ignore quota/private-mode errors */ }
      }
      router.replace('/home');
    });

    return () => { alive = false; };
  }, [router]);

  return <ConstellationLoader message="Preparing your journey..." />;
}
