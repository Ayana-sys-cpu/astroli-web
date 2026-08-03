import { describe, it, expect } from 'vitest';
import {
  pickEdit,
  pickEditPerTier,
  tierOf,
  TIER,
  type SpotlightCandidate,
  type StudentPlace,
} from '@/lib/spotlight-ranking';

function candidate(id: string, planetId: string, over: Partial<SpotlightCandidate> = {}): SpotlightCandidate {
  return {
    id,
    edit_type: 'did_you_know',
    planet_id: planetId,
    interest_theme: null,
    hook: `hook ${id}`,
    media_url: 'https://img/x.jpg',
    media_type: 'image',
    media_credit: 'Someone',
    created_at: '2026-07-01T00:00:00Z',
    ...over,
  };
}

function place(over: Partial<StudentPlace> = {}): StudentPlace {
  return {
    activePlanetId: 'planet-active',
    completedPlanetIds: new Set(['planet-done']),
    journeyPlanetIds: new Set(['planet-active', 'planet-done', 'planet-ahead']),
    interestTheme: null,
    seenEditIds: new Set(),
    ...over,
  };
}

describe('tierOf', () => {
  it('ranks planets by how close they are to where the student is', () => {
    const p = place();
    expect(tierOf('planet-active', p)).toBe(TIER.activePlanet);
    expect(tierOf('planet-done', p)).toBe(TIER.completedPlanet);
    expect(tierOf('planet-ahead', p)).toBe(TIER.upcomingPlanet);
    expect(tierOf('planet-elsewhere', p)).toBe(TIER.otherJourney);
  });

  it('treats every planet as far away for a student with no journey', () => {
    const p = place({ activePlanetId: null, completedPlanetIds: new Set(), journeyPlanetIds: new Set() });
    expect(tierOf('planet-active', p)).toBe(TIER.otherJourney);
  });
});

describe('pickEdit', () => {
  it('prefers the planet the student is on', () => {
    const picked = pickEdit(
      [
        candidate('elsewhere', 'planet-elsewhere'),
        candidate('ahead', 'planet-ahead'),
        candidate('done', 'planet-done'),
        candidate('active', 'planet-active'),
      ],
      place(),
    );
    expect(picked!.id).toBe('active');
  });

  it('falls to a finished planet before one the student has not reached', () => {
    const picked = pickEdit([candidate('ahead', 'planet-ahead'), candidate('done', 'planet-done')], place());
    expect(picked!.id).toBe('done');
  });

  it('falls to another journey entirely rather than show nothing', () => {
    const picked = pickEdit([candidate('elsewhere', 'planet-elsewhere')], place());
    expect(picked!.id).toBe('elsewhere');
  });

  it('shows something new over something closer they have already met', () => {
    const picked = pickEdit(
      [candidate('seen-active', 'planet-active'), candidate('fresh-elsewhere', 'planet-elsewhere')],
      place({ seenEditIds: new Set(['seen-active']) }),
    );
    expect(picked!.id).toBe('fresh-elsewhere');
  });

  it('repeats the closest edit once every one has been seen', () => {
    const picked = pickEdit(
      [candidate('seen-elsewhere', 'planet-elsewhere'), candidate('seen-active', 'planet-active')],
      place({ seenEditIds: new Set(['seen-active', 'seen-elsewhere']) }),
    );
    expect(picked!.id).toBe('seen-active');
  });

  it('breaks a tie on the student’s declared interest', () => {
    const picked = pickEdit(
      [
        candidate('other', 'planet-active', { interest_theme: 'cooking' }),
        candidate('space-one', 'planet-active', { interest_theme: 'space' }),
      ],
      place({ interestTheme: 'space' }),
    );
    expect(picked!.id).toBe('space-one');
  });

  it('breaks a remaining tie on the newest edit', () => {
    const picked = pickEdit(
      [
        candidate('old', 'planet-active', { created_at: '2026-01-01T00:00:00Z' }),
        candidate('new', 'planet-active', { created_at: '2026-07-20T00:00:00Z' }),
      ],
      place(),
    );
    expect(picked!.id).toBe('new');
  });

  it('returns nothing when there is nothing published', () => {
    expect(pickEdit([], place())).toBeNull();
  });
});

describe('pickEditPerTier', () => {
  const everyTier = () => [
    candidate('elsewhere', 'planet-elsewhere'),
    candidate('ahead', 'planet-ahead'),
    candidate('done', 'planet-done'),
    candidate('active', 'planet-active'),
  ];

  it('gives one card per tier, in reading order', () => {
    const picked = pickEditPerTier(everyTier(), place());
    expect(picked.map((p) => p.tier)).toEqual(['active', 'upcoming', 'completed', 'detour']);
    expect(picked.map((p) => p.edit.id)).toEqual(['active', 'ahead', 'done', 'elsewhere']);
  });

  it('picks the best edit within each tier', () => {
    const picked = pickEditPerTier(
      [
        candidate('active-old', 'planet-active', { created_at: '2026-01-01T00:00:00Z' }),
        candidate('active-new', 'planet-active', { created_at: '2026-07-20T00:00:00Z' }),
        candidate('elsewhere', 'planet-elsewhere'),
      ],
      place(),
    );
    expect(picked[0]).toMatchObject({ tier: 'active' });
    expect(picked[0].edit.id).toBe('active-new');
  });

  it('fills an empty tier with the next best edit, keeping its own label', () => {
    const picked = pickEditPerTier(
      [
        candidate('active', 'planet-active'),
        candidate('done', 'planet-done'),
        candidate('elsewhere-a', 'planet-elsewhere', { created_at: '2026-07-20T00:00:00Z' }),
        candidate('elsewhere-b', 'planet-elsewhere', { created_at: '2026-01-01T00:00:00Z' }),
      ],
      place(),
    );
    expect(picked).toHaveLength(4);
    expect(picked.map((p) => p.tier)).toEqual(['active', 'completed', 'detour', 'detour']);
  });

  it('labels everything a detour for a student with no journey', () => {
    const picked = pickEditPerTier(
      everyTier(),
      place({ activePlanetId: null, completedPlanetIds: new Set(), journeyPlanetIds: new Set() }),
    );
    expect(picked).toHaveLength(4);
    expect(picked.every((p) => p.tier === 'detour')).toBe(true);
  });

  it('never repeats an edit across slots', () => {
    const picked = pickEditPerTier(everyTier(), place());
    expect(new Set(picked.map((p) => p.edit.id)).size).toBe(picked.length);
  });

  it('returns however many exist when there are fewer than four', () => {
    const picked = pickEditPerTier([candidate('active', 'planet-active')], place());
    expect(picked).toHaveLength(1);
  });

  it('returns nothing when there is nothing published', () => {
    expect(pickEditPerTier([], place())).toEqual([]);
  });

  it('prefers an unseen edit over a closer one they have already met', () => {
    const picked = pickEditPerTier(
      [
        candidate('seen-active', 'planet-active'),
        candidate('fresh-active', 'planet-active'),
      ],
      place({ seenEditIds: new Set(['seen-active']) }),
    );
    expect(picked[0].edit.id).toBe('fresh-active');
  });
});
