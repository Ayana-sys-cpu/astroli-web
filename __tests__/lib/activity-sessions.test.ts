import { describe, it, expect } from 'vitest';
import {
  sessionDurationMinutes,
  summarizeStudentActivity,
} from '@/lib/activity-sessions';

const NOW = new Date('2026-07-15T12:00:00Z');

function session(overrides: Partial<{ started_at: string; last_ping_at: string }>) {
  return {
    started_at:   '2026-07-15T10:00:00Z',
    last_ping_at: '2026-07-15T10:20:00Z',
    ...overrides,
  };
}

describe('sessionDurationMinutes', () => {
  it('returns the whole minutes between first and last ping', () => {
    expect(sessionDurationMinutes(session({}))).toBe(20);
  });

  it('floors a single-ping session (start == last ping) at 1 minute', () => {
    expect(sessionDurationMinutes(session({ last_ping_at: '2026-07-15T10:00:00Z' }))).toBe(1);
  });

  it('rounds partial minutes to the nearest minute', () => {
    expect(sessionDurationMinutes(session({ last_ping_at: '2026-07-15T10:04:40Z' }))).toBe(5);
  });
});

describe('summarizeStudentActivity', () => {
  it('returns an empty summary for no sessions', () => {
    expect(summarizeStudentActivity([], NOW)).toEqual({
      lastActiveAt:   null,
      sessionsLast7d: 0,
      minutesLast7d:  0,
    });
  });

  it('counts only sessions whose last ping falls inside the trailing 7 days', () => {
    const summary = summarizeStudentActivity(
      [
        session({ started_at: '2026-07-14T09:00:00Z', last_ping_at: '2026-07-14T09:30:00Z' }), // inside
        session({ started_at: '2026-07-01T09:00:00Z', last_ping_at: '2026-07-01T09:45:00Z' }), // outside
      ],
      NOW,
    );
    expect(summary.sessionsLast7d).toBe(1);
    expect(summary.minutesLast7d).toBe(30);
  });

  it('reports lastActiveAt from the newest ping even when it is older than 7 days', () => {
    const summary = summarizeStudentActivity(
      [session({ started_at: '2026-07-01T09:00:00Z', last_ping_at: '2026-07-01T09:45:00Z' })],
      NOW,
    );
    expect(summary.lastActiveAt).toBe('2026-07-01T09:45:00.000Z');
    expect(summary.sessionsLast7d).toBe(0);
  });

  it('sums durations across recent sessions and picks the newest ping as lastActiveAt', () => {
    const summary = summarizeStudentActivity(
      [
        session({ started_at: '2026-07-15T10:00:00Z', last_ping_at: '2026-07-15T10:20:00Z' }),
        session({ started_at: '2026-07-13T08:00:00Z', last_ping_at: '2026-07-13T08:10:00Z' }),
      ],
      NOW,
    );
    expect(summary).toEqual({
      lastActiveAt:   '2026-07-15T10:20:00.000Z',
      sessionsLast7d: 2,
      minutesLast7d:  30,
    });
  });
});
