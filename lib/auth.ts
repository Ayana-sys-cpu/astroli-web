import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createSSRServerClient } from './supabase-server';

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
