// Stale-while-revalidate cache for the student home screen.
//
// Mirrors lib/landscape-cache.ts.  Home already has a one-shot cache
// (`astroli_home_cache`) written by the /syncing interstitial, but it is
// consumed once and removed, so ordinary back-navigation to /home re-fetches
// and shows the "SYNCING…" skeleton every time.  This persistent (per-tab,
// auto-cleared on tab close) cache lets a return visit paint the journey cards
// instantly, then /api/student/home revalidates in the background.
//
// The bundle is exactly the fetched payload — { journeys, hasParent, language }.
// Home does no on-mount writes, so nothing here needs a background side effect.

import type { HomeJourney } from '@/lib/student-home';
import type { Lang } from '@/lib/i18n';

export interface HomeCacheBundle {
  journeys: HomeJourney[];
  hasParent: boolean;
  /** The PERSON's language — chrome only. Each journey carries its own. */
  language?: Lang;
}

// Bump the version suffix if the bundle shape changes so stale-shaped entries
// from an older deploy are ignored rather than hydrated. v2 adds `language`: a
// v1 entry has none, and hydrating it would paint a Hebrew student's chrome in
// English until the revalidation landed.
const KEY = 'home-cache:v2';

export function readHomeCache(): HomeCacheBundle | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeCacheBundle;
    // An empty journeys array is a valid state (student with no active
    // journeys), but a missing/non-array journeys means a broken entry.
    if (!parsed || !Array.isArray(parsed.journeys)) return null;
    return {
      journeys: parsed.journeys,
      hasParent: !!parsed.hasParent,
      language: parsed.language === 'he' || parsed.language === 'en' ? parsed.language : undefined,
    };
  } catch {
    return null;
  }
}

export function writeHomeCache(bundle: HomeCacheBundle): void {
  try {
    if (!Array.isArray(bundle.journeys)) return;
    sessionStorage.setItem(KEY, JSON.stringify(bundle));
  } catch {
    // Quota / serialization failure is non-fatal — home just re-fetches next
    // time as it did before this cache existed.
  }
}
