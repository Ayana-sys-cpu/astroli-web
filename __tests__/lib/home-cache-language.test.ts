import { describe, it, expect, beforeEach } from 'vitest';
import { readHomeCache, writeHomeCache } from '@/lib/home-cache';

// The home screen's chrome language now comes from the PERSON, carried through
// this cache so a return visit paints in the right language instead of flashing
// English. A v1 entry (written before `language` existed) must not hydrate —
// that flash is exactly what the version bump prevents.

const journeys = [{ id: 'j1', language: 'en' } as any];

beforeEach(() => sessionStorage.clear());

describe('home cache carries the person language', () => {
  it('round-trips the language', () => {
    writeHomeCache({ journeys, hasParent: true, language: 'he' });
    expect(readHomeCache()?.language).toBe('he');
  });

  it('returns undefined rather than guessing when no language was stored', () => {
    writeHomeCache({ journeys, hasParent: false });
    expect(readHomeCache()?.language).toBeUndefined();
  });

  it('ignores a stale v1 entry instead of hydrating it', () => {
    sessionStorage.setItem('home-cache:v1', JSON.stringify({ journeys, hasParent: true }));
    expect(readHomeCache()).toBeNull();
  });

  it('narrows an unexpected stored value instead of passing it through', () => {
    sessionStorage.setItem(
      'home-cache:v2',
      JSON.stringify({ journeys, hasParent: true, language: 'fr' }),
    );
    expect(readHomeCache()?.language).toBeUndefined();
  });

  // The bug this whole phase exists to kill: chrome language must not be a
  // function of which journey sorts first.
  it('does not derive language from the journey list', () => {
    const mixed = [
      { id: 'a', language: 'he' } as any,
      { id: 'b', language: 'en' } as any,
    ];
    writeHomeCache({ journeys: mixed, hasParent: true, language: 'en' });
    const got = readHomeCache();
    expect(got?.language).toBe('en');
    expect(got?.journeys[0].language).toBe('he');
  });
});
