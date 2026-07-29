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
  const ranked = [...candidates].sort((a, b) => {
    const seen = Number(place.seenEditIds.has(a.id)) - Number(place.seenEditIds.has(b.id));
    if (seen !== 0) return seen;

    const tier = tierOf(a.planet_id, place) - tierOf(b.planet_id, place);
    if (tier !== 0) return tier;

    const interest = Number(matchesInterest(b, place)) - Number(matchesInterest(a, place));
    if (interest !== 0) return interest;

    return b.created_at.localeCompare(a.created_at);
  });

  return ranked[0] ?? null;
}

function matchesInterest(edit: SpotlightCandidate, place: StudentPlace): boolean {
  return !!place.interestTheme && edit.interest_theme === place.interestTheme;
}
