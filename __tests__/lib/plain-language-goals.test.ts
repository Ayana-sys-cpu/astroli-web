import { describe, it, expect } from 'vitest';
import {
  PERKINS_PLAIN_TITLES,
  PERKINS_TOOLTIPS,
  plainTitle,
  performanceTooltip,
  performanceLabel,
  type PerkinsLevel,
} from '@/lib/drill-down-types';

const LEVELS: PerkinsLevel[] = [1, 2, 3, 4, 5, 6, 7];

describe('plain-language goal titles', () => {
  it('covers every level', () => {
    for (const l of LEVELS) {
      expect(PERKINS_PLAIN_TITLES[l]).toBeTruthy();
      expect(PERKINS_TOOLTIPS[l]).toBeTruthy();
    }
  });

  it('resolves a title from a demonstrated level', () => {
    expect(plainTitle({ level: 5, isGraceCompletion: false })).toBe('Can use it to solve something new');
  });

  it('falls back to the unreached title for grace, no level, and null', () => {
    const expected = 'Still finding their feet here';
    expect(plainTitle({ level: 5, isGraceCompletion: true })).toBe(expected);
    expect(plainTitle({ level: null, isGraceCompletion: false })).toBe(expected);
    expect(plainTitle(null)).toBe(expected);
  });

  it('explains the unreached case as not a failure', () => {
    expect(performanceTooltip(null).toLowerCase()).toContain('not a failure');
  });

  it('gives every level a tooltip that is not just its own name', () => {
    for (const l of LEVELS) {
      const tip = performanceTooltip({ level: l, isGraceCompletion: false });
      expect(tip).toBe(PERKINS_TOOLTIPS[l]);
      // The old tooltip restated the level name and ordinal, which explains
      // nothing to anyone who doesn't already know the scale.
      expect(tip.toLowerCase()).not.toContain('level');
      expect(tip.toLowerCase()).not.toContain('perkins');
    }
  });
});

describe('no internal vocabulary reaches a user', () => {
  it('never labels anything "Grace Completion"', () => {
    expect(performanceLabel({ level: null, isGraceCompletion: true })).toBe('Finished with support');
  });

  it('keeps every plain title and tooltip free of Perkins and Grace', () => {
    const strings = [
      ...Object.values(PERKINS_PLAIN_TITLES),
      ...Object.values(PERKINS_TOOLTIPS),
      plainTitle(null),
      performanceTooltip(null),
    ];
    for (const s of strings) {
      expect(s.toLowerCase()).not.toContain('perkins');
      expect(s.toLowerCase()).not.toContain('grace');
    }
  });
});
