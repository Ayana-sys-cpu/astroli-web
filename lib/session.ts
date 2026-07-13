/**
 * Client-side helpers for reading identity from the Supabase session.
 *
 * These are the ONLY correct way to get a student or teacher ID on the client.
 * Do NOT read identity from localStorage — it is not the source of truth and
 * can be tampered with. The Supabase session is cryptographically signed by
 * the server and stored in cookies.
 *
 * Supabase serves getSession() from its in-memory cache — no network
 * round-trip on subsequent calls within the same page load.
 *
 * Usage in a React component:
 *   const [studentId, setStudentId] = useState<string | null>(null);
 *   useEffect(() => { getSessionStudentId().then(setStudentId); }, []);
 *
 * Usage in an async event handler:
 *   const studentId = await getSessionStudentId();
 */

import { getBrowserClient } from './supabase';

async function getSessionMetadata(): Promise<Record<string, unknown>> {
  const { data: { session } } = await getBrowserClient().auth.getSession();
  return (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
}

/**
 * Returns the authenticated student's DB user_id, or null if not a student session.
 *
 * Primary source: session user_metadata.student_id. Fallback: GET /api/student/me —
 * a client session token minted before the server-side metadata self-heal
 * (see resolveStudentId in lib/auth.ts) carries stale metadata until refresh,
 * so metadata alone would wrongly report "not a student" for a logged-in student.
 * When the fallback resolves, the session is refreshed so subsequent reads hit
 * the metadata fast path.
 */
export async function getSessionStudentId(): Promise<string | null> {
  const { data: { session } } = await getBrowserClient().auth.getSession();
  if (!session) return null;

  const meta = (session.user?.user_metadata ?? {}) as Record<string, unknown>;
  const fromMeta = meta.student_id as string | undefined;
  if (fromMeta) return fromMeta;

  return fetchHealedStudentId();
}

/** Asks the server to resolve (and self-heal) the student identity, then refreshes the token. */
async function fetchHealedStudentId(): Promise<string | null> {
  try {
    const res = await fetch('/api/student/me');
    if (!res.ok) return null;

    const body: { studentId?: unknown } = await res.json();
    if (typeof body.studentId !== 'string' || !body.studentId) return null;

    // The endpoint backfilled user_metadata.student_id on the auth user;
    // re-mint the client token so future calls skip this fallback.
    await getBrowserClient().auth.refreshSession();

    return body.studentId;
  } catch {
    return null;
  }
}

// NOTE: There is intentionally no getSessionFirstName() here. The students'
// first name is DISPLAY-layer data, not identity — read it synchronously from
// the display store via getFirstName() in lib/student-store.ts (set at login).
// A browser-client read of the `users` table is blocked by RLS and silently
// returns null, which previously surfaced as the fallback name "Traveler".

/** Returns the authenticated teacher's DB user_id, or null if not a teacher session. */
export async function getSessionTeacherId(): Promise<string | null> {
  const meta = await getSessionMetadata();
  return (meta.teacher_id as string | undefined) ?? null;
}

/**
 * Returns the raw Supabase access token for the current session, or null if
 * not signed in. Send this as `Authorization: Bearer <token>` when calling the
 * bot API so the bot can verify identity server-side.
 */
export async function getSessionToken(): Promise<string | null> {
  const { data: { session } } = await getBrowserClient().auth.getSession();
  return session?.access_token ?? null;
}

/** Returns 'student' | 'teacher' | null for the current session. */
export async function getSessionRole(): Promise<'student' | 'teacher' | null> {
  const meta = await getSessionMetadata();
  const role = meta.role as string | undefined;
  if (role === 'student' || role === 'teacher') return role;
  return null;
}

/**
 * Signs the user out of Supabase — revokes the server-side session and
 * clears the auth cookies. Call this alongside clearSession() /
 * clearTeacherSession() when logging out.
 */
export async function supabaseSignOut(): Promise<void> {
  await getBrowserClient().auth.signOut();
}
