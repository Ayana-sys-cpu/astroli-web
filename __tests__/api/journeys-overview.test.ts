import { describe, it, expect } from 'vitest';
import { deriveJourneyStatus } from '@/lib/journey-status';

describe('deriveJourneyStatus', () => {
  it('returns live when any mission is active', () => {
    expect(deriveJourneyStatus(
      [{ state: 'active' }, { state: 'locked' }] as any,
      false
    )).toBe('live');
  });

  it('returns voting when there is an open vote session', () => {
    expect(deriveJourneyStatus(
      [{ state: 'locked' }] as any,
      true
    )).toBe('voting');
  });

  it('returns voting when any mission is in voting state', () => {
    expect(deriveJourneyStatus(
      [{ state: 'voting' }, { state: 'locked' }] as any,
      false
    )).toBe('voting');
  });

  it('returns pending when any mission is pending_start', () => {
    expect(deriveJourneyStatus(
      [{ state: 'pending_start' }, { state: 'skipped' }] as any,
      false
    )).toBe('pending');
  });

  it('returns done when all missions are completed or skipped', () => {
    expect(deriveJourneyStatus(
      [{ state: 'completed' }, { state: 'skipped' }] as any,
      false
    )).toBe('done');
  });

  it('returns idle when no missions and no vote session', () => {
    expect(deriveJourneyStatus([], false)).toBe('idle');
  });

  it('returns idle when all missions are locked', () => {
    expect(deriveJourneyStatus(
      [{ state: 'locked' }] as any,
      false
    )).toBe('idle');
  });
});
