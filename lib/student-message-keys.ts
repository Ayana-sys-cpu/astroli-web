// Every key a student's bot `messages` rows may be stored under.
//
// messages.student_id (uuid) has been written under two regimes: the bot's
// middleware resolves auth uid -> users.id before writing, but early rows —
// and the fallback for users with no `users` row at first message — used the
// raw Supabase auth uid. Verified against the live DB on 2026-07-15: current
// data is keyed by users.id, but both regimes must stay queryable.
// Query with .in('student_id', messageKeysFor(user)).

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function messageKeysFor(user: { id: string; auth_user_id: string | null }): string[] {
  const candidates = [user.id, user.auth_user_id];
  const keys = candidates.filter(
    (key): key is string => typeof key === 'string' && UUID_PATTERN.test(key),
  );
  return Array.from(new Set(keys));
}
