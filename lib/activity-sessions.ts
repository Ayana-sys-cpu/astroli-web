// Session math for student_activity_sessions rows.
//
// A "session" is one continuous stretch of activity: the ping endpoint
// stitches pings gapped under SESSION_STITCH_GAP_MINUTES into the same row,
// so duration is simply last_ping_at - started_at. Single-ping sessions have
// zero span but represent a real visit, hence the 1-minute floor.

export const SESSION_STITCH_GAP_MINUTES = 30;

export type ActivitySessionRow = {
  started_at:   string;
  last_ping_at: string;
};

export type StudentActivitySummary = {
  lastActiveAt:   string | null;
  sessionsLast7d: number;
  minutesLast7d:  number;
};

const MS_PER_MINUTE = 60_000;
const TRAILING_WINDOW_DAYS = 7;

export function sessionDurationMinutes(session: ActivitySessionRow): number {
  const spanMs = new Date(session.last_ping_at).getTime() - new Date(session.started_at).getTime();
  return Math.max(1, Math.round(spanMs / MS_PER_MINUTE));
}

export function summarizeStudentActivity(
  sessions: ActivitySessionRow[],
  now: Date,
): StudentActivitySummary {
  const windowStartMs = now.getTime() - TRAILING_WINDOW_DAYS * 24 * 60 * MS_PER_MINUTE;

  let lastActiveMs: number | null = null;
  let sessionsLast7d = 0;
  let minutesLast7d = 0;

  for (const session of sessions) {
    const lastPingMs = new Date(session.last_ping_at).getTime();
    if (lastActiveMs === null || lastPingMs > lastActiveMs) lastActiveMs = lastPingMs;
    if (lastPingMs >= windowStartMs) {
      sessionsLast7d += 1;
      minutesLast7d += sessionDurationMinutes(session);
    }
  }

  return {
    lastActiveAt: lastActiveMs === null ? null : new Date(lastActiveMs).toISOString(),
    sessionsLast7d,
    minutesLast7d,
  };
}
