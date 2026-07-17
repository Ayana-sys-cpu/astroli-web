// Stale-while-revalidate cache for the landscape (map) screen.
//
// Why this exists: on web, returning to the map is a fresh router.push, which
// remounts the page and re-runs its journey → mission → planet-progress →
// mission-state fetch waterfall with no client cache — the visible "SYNCING…"
// flash on every back-navigation.  We stash the resolved map bundle in
// sessionStorage (per-tab, auto-cleared on tab close — no COPPA/FERPA concern
// since it's the student's own progress) so a return visit paints instantly,
// then the page revalidates in the background and overwrites this.
//
// Only normal student mode caches — teacher preview and review mode are
// deliberately excluded (transient, and preview has no student session).

import type { OrinMission } from '@/lib/orin-guide-types';
import type { MissionStatePayload } from '@/components/OrinGuidePanel';

// Kept structurally in sync with the Mission interface in app/landscape/page.tsx.
// Typed as unknown here to avoid a circular import from the page component;
// the page casts it back on read.
export interface LandscapeCacheBundle {
  mission: unknown;
  planetProgress: Record<string, { goalsDiscovered: number; totalGoals: number; completed: boolean }>;
  initialMissionState: MissionStatePayload | null;
  orinMission: OrinMission | null;
}

// Bump the version suffix if the bundle shape changes, so stale-shaped entries
// from an older deploy are ignored rather than hydrated.
const KEY_PREFIX = 'landscape-cache:v1:';

function keyFor(classId: string | null): string {
  return `${KEY_PREFIX}${classId ?? 'none'}`;
}

export function readLandscapeCache(classId: string | null): LandscapeCacheBundle | null {
  try {
    const raw = sessionStorage.getItem(keyFor(classId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LandscapeCacheBundle;
    // Never hydrate a bundle without a mission — the map must never paint empty.
    if (!parsed || !parsed.mission) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLandscapeCache(classId: string | null, bundle: LandscapeCacheBundle): void {
  try {
    if (!bundle.mission) return;
    sessionStorage.setItem(keyFor(classId), JSON.stringify(bundle));
  } catch {
    // Quota / serialization failure is non-fatal — the page just re-fetches
    // next time as it did before this cache existed.
  }
}
