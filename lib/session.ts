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

/** Returns the authenticated student's DB user_id, or null if not a student session. */
export async function getSessionStudentId(): Promise<string | null> {
  const meta = await getSessionMetadata();
  return (meta.student_id as string | undefined) ?? null;
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
