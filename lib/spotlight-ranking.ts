import type { EditType } from './feed-scoring';

export interface SpotlightCandidate {
  id: string;
  edit_type: EditType;
  planet_id: string;
  interest_theme: string | null;
  hook: string;
  media_url: string;
  media_type: 'image' | 'video';
  media_credit: string;
  created_at: string;
}

/** Where the student is right now — everything ranking needs to know about them. */
export interface StudentPlace {
  activePlanetId: string | null;
  completedPlanetIds: Set<string>;
  journeyPlanetIds: Set<string>;
  interestTheme: string | null;
  seenEditIds: Set<string>;
}

/** Closeness of an edit's planet to where the student is. Lower wins. */
export const TIER = {
  activePlanet: 0,
  completedPlanet: 1,
  upcomingPlanet: 2,
  otherJourney: 3,
} as const;

export function tierOf(planetId: string, place: StudentPlace): number {
  if (planetId === place.activePlanetId) return TIER.activePlanet;
  if (place.completedPlanetIds.has(planetId)) return TIER.completedPlanet;
  if (place.journeyPlanetIds.has(planetId)) return TIER.upcomingPlanet;
  return TIER.otherJourney;
}

/**
 * Every published edit is a candidate, so the panel is never empty — what
 * changes is the order.
 *
 * Unseen outranks everything: a student who already met an edit in their feed
 * deserves something new, even from further away. Then closeness (the planet
 * they are on → ones they finished → ones ahead → other journeys), then their
 * declared interest, then whichever is newest.
 */
export function pickEdit(
  candidates: SpotlightCandidate[],
  place: StudentPlace,
): SpotlightCandidate | null {
  const ranked = [...candidates].sort(compareForPlace(place));

  return ranked[0] ?? null;
}

/** Unseen first, then closeness, then declared interest, then newest. */
function compareForPlace(place: StudentPlace) {
  return (a: SpotlightCandidate, b: SpotlightCandidate): number => {
    const seen = Number(place.seenEditIds.has(a.id)) - Number(place.seenEditIds.has(b.id));
    if (seen !== 0) return seen;

    const tier = tierOf(a.planet_id, place) - tierOf(b.planet_id, place);
    if (tier !== 0) return tier;

    const interest = Number(matchesInterest(b, place)) - Number(matchesInterest(a, place));
    if (interest !== 0) return interest;

    return b.created_at.localeCompare(a.created_at);
  };
}

function matchesInterest(edit: SpotlightCandidate, place: StudentPlace): boolean {
  return !!place.interestTheme && edit.interest_theme === place.interestTheme;
}

/** The tier names the Master launchpad shows on its cards. */
export type LaunchpadTier = 'active' | 'upcoming' | 'completed' | 'detour';

/** Display order of the launchpad cards — deliberately not the ranking order. */
const LAUNCHPAD_TIERS: readonly LaunchpadTier[] = ['active', 'upcoming', 'completed', 'detour'];

const TIER_NAME: Record<number, LaunchpadTier> = {
  [TIER.activePlanet]: 'active',
  [TIER.completedPlanet]: 'completed',
  [TIER.upcomingPlanet]: 'upcoming',
  [TIER.otherJourney]: 'detour',
};

export function launchpadTierOf(planetId: string, place: StudentPlace): LaunchpadTier {
  return TIER_NAME[tierOf(planetId, place)];
}

export interface TieredEdit {
  edit: SpotlightCandidate;
  tier: LaunchpadTier;
}

/**
 * One edit per tier, for the Master launchpad — four different angles rather
 * than four variations on the planet the student happens to be sitting on.
 *
 * A tier with no candidate does not leave a gap: the slot takes the best
 * remaining edit from anywhere, still wearing its own true label, so a student
 * with no journey at all still gets a full set of four.
 */
export function pickEditPerTier(
  candidates: SpotlightCandidate[],
  place: StudentPlace,
  limit = LAUNCHPAD_TIERS.length,
): TieredEdit[] {
  const ranked = [...candidates]
    .sort(compareForPlace(place))
    .map((edit) => ({ edit, tier: launchpadTierOf(edit.planet_id, place) }));

  const used = new Set<string>();
  const picked: TieredEdit[] = [];

  for (const tier of LAUNCHPAD_TIERS) {
    const match = ranked.find((r) => r.tier === tier && !used.has(r.edit.id));
    if (match) {
      used.add(match.edit.id);
      picked.push(match);
    }
  }

  for (const candidate of ranked) {
    if (picked.length >= limit) break;
    if (used.has(candidate.edit.id)) continue;
    used.add(candidate.edit.id);
    picked.push(candidate);
  }

  return picked.slice(0, limit);
}
