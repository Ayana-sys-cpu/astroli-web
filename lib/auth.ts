import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createSSRServerClient, supabaseAdmin } from './supabase-server';

type AuthOk   = { ok: true;  user: User };
type AuthFail = { ok: false; response: NextResponse };
export type AuthResult = AuthOk | AuthFail;

/**
 * Extracts the verified Supabase Auth user from the session cookie.
 *
 * Usage in any API route:
 *   const auth = await requireAuth();
 *   if (!auth.ok) return auth.response;   // returns 401 if no/invalid session
 *   const { user } = auth;
 *   // user.user_metadata.student_id  — for student routes
 *   // user.user_metadata.teacher_id  — for teacher routes
 *   // user.user_metadata.role        — 'student' | 'teacher'
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = createSSRServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { ok: true, user };
}

/**
 * Resolves the student_id for an authenticated user.
 *
 * Primary source: user.user_metadata.student_id (set during sign-in).
 * Fallback: DB lookup by email — handles the Supabase edge case where
 * verifyOtp() overwrites raw_user_meta_data before our updateUserById()
 * value takes effect, leaving student_id null in the JWT.
 *
 * Also self-heals: when the fallback is used, it backfills the metadata
 * on the auth user so subsequent requests hit the fast path.
 */
export async function resolveStudentId(user: User): Promise<string | null> {
  const fromMeta = user.user_metadata?.student_id as string | undefined;
  if (fromMeta) {
    return fromMeta;
  }

  console.log('[resolveStudentId] metadata missing student_id — falling back to DB lookup. user_metadata:', JSON.stringify(user.user_metadata));

  // Fallback: look up by email
  const { data, error: lookupErr } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', user.email!.toLowerCase())
    .eq('role', 'student')
    .maybeSingle();
  if (lookupErr) console.error('[resolveStudentId] DB lookup error:', lookupErr);

  if (!data?.id) return null;

  // Self-heal: backfill metadata so the next request uses the fast path.
  supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      role:       'student',
      student_id: data.id,
      teacher_id: null,
    },
  }).catch((err) => console.error('[resolveStudentId] metadata backfill failed:', err));

  return data.id;
}

/**
 * Resolves a student_id from either a Supabase cookie session (web) or an
 * `x-student-id` request header (mobile). Returns null if neither is valid.
 *
 * Mobile clients cannot establish cookie sessions, so they pass their known
 * student_id via the `x-student-id` header. We verify it exists in the DB
 * before trusting it.
 */
export async function resolveStudentIdFromRequest(req: NextRequest): Promise<string | null> {
  // 1. Try cookie-based session (web frontend path).
  const auth = await requireAuth();
  if (auth.ok) {
    return resolveStudentId(auth.user);
  }

  // 2. Fall back to mobile header (x-student-id).
  const headerStudentId = req.headers.get('x-student-id');
  if (!headerStudentId) return null;

  // Validate the student actually exists in the DB before trusting the header.
  const { data } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', headerStudentId)
    .eq('role', 'student')
    .maybeSingle();

  return data?.id ?? null;
}

/**
 * Returns a 403 NextResponse if the session user does not have a student_id
 * in their metadata (i.e., this is not a student session).
 * Returns null if the session is valid for a student.
 */
export function assertStudentSession(user: User): NextResponse | null {
  const studentId = user.user_metadata?.student_id as string | undefined;
  if (!studentId) {
    return NextResponse.json(
      { error: 'Forbidden: student session required' },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Returns a 403 NextResponse if the session user does not have a teacher_id
 * in their metadata (i.e., this is not a teacher session).
 * Returns null if the session is valid for a teacher.
 */
export function assertTeacherSession(user: User): NextResponse | null {
  const teacherId = user.user_metadata?.teacher_id as string | undefined;
  if (!teacherId) {
    return NextResponse.json(
      { error: 'Forbidden: teacher session required' },
      { status: 403 },
    );
  }
  return null;
}
