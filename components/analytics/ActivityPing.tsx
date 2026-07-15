'use client';

// Activity heartbeat for the founder's Pilot Review Dashboard.
// Mounted once in app/layout.tsx; renders nothing.
//
// Pings POST /api/activity/ping on student surfaces only: on arrival, every
// 5 minutes while the tab is visible, and immediately when the tab becomes
// visible again. Stops permanently for this page load once the server says
// the session isn't a student's ({tracked:false}) or auth fails (401/403) —
// teacher/parent/founder/anonymous browsing costs at most one request.
// Spec: specs/founder/web-app/pilot-review-dashboard/ (User Story 3).

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const STUDENT_ROUTE_PREFIXES = [
  '/home',
  '/landscape',
  '/store',
  '/vote',
  '/family',
  '/pending-journey',
  '/onboarding',
];

const PING_INTERVAL_MS = 5 * 60 * 1000;

function isStudentSurface(pathname: string | null): boolean {
  if (!pathname) return false;
  return STUDENT_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function ActivityPing() {
  const pathname = usePathname();
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (stoppedRef.current || !isStudentSurface(pathname)) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    async function ping() {
      if (stoppedRef.current || document.visibilityState === 'hidden') return;
      try {
        const res = await fetch('/api/activity/ping', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ platform: 'web' }),
        });
        if (res.status === 401 || res.status === 403) {
          stoppedRef.current = true;
          return;
        }
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.tracked === false) stoppedRef.current = true;
        }
      } catch {
        // Network hiccup — the next interval tick retries.
      }
      if (stoppedRef.current && interval) clearInterval(interval);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') ping();
    }

    ping();
    interval = setInterval(ping, PING_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]);

  return null;
}
