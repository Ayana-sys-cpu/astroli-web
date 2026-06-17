import { describe, it, expect } from 'vitest';
import { toDatetimeLocal, formatCountdown } from '@/lib/vote-utils';

describe('toDatetimeLocal', () => {
  it('formats a date to datetime-local string with zero-padded components', () => {
    // month = 0 (January), day = 5, hour = 3, minute = 7 → must be zero-padded
    const d = new Date(2026, 0, 5, 3, 7);
    expect(toDatetimeLocal(d)).toBe('2026-01-05T03:07');
  });

  it('formats a date with two-digit month, day, hour, minute unchanged', () => {
    const d = new Date(2026, 11, 25, 14, 30); // December 25 14:30
    expect(toDatetimeLocal(d)).toBe('2026-12-25T14:30');
  });

  it('formats midnight correctly', () => {
    const d = new Date(2026, 5, 1, 0, 0); // June 1 00:00
    expect(toDatetimeLocal(d)).toBe('2026-06-01T00:00');
  });
});

describe('formatCountdown', () => {
  it('returns "00:00:00" when the end time has already passed', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(formatCountdown(past)).toBe('00:00:00');
  });

  it('formats hours:minutes:seconds when less than one day remains', () => {
    // 2 hours, 5 minutes, 3 seconds from now
    const future = new Date(Date.now() + 2 * 3_600_000 + 5 * 60_000 + 3_000).toISOString();
    expect(formatCountdown(future)).toMatch(/^02:05:0[23]$/); // allow 1s clock drift
  });

  it('formats "Xd Yh Zm" when one or more days remain', () => {
    // 1 day, 3 hours, 2 minutes from now
    const future = new Date(Date.now() + 86_400_000 + 3 * 3_600_000 + 2 * 60_000).toISOString();
    expect(formatCountdown(future)).toMatch(/^1d 3h 2m$/);
  });

  it('formats multiple days correctly', () => {
    const future = new Date(Date.now() + 3 * 86_400_000 + 12 * 3_600_000 + 0).toISOString();
    expect(formatCountdown(future)).toMatch(/^3d 12h 0m$/);
  });
});
