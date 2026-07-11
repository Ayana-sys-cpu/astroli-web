// GET /api/auth/dev-teacher-login
//
// Temporary dev-only endpoint. Signs the teacher account in with one click
// and lands on /teacher. DELETE this file before going to production.
// Flow and constraints: see lib/dev-login.ts.

import type { NextRequest } from 'next/server';
import { signInDevAccount } from '@/lib/dev-login';

const TEACHER_EMAIL = 'ayana6@gmail.com';
const TEACHER_USER_ID = 'd16a01aa-f098-473c-a022-8e7dc66d58ac'; // users.id

export async function GET(req: NextRequest) {
  return signInDevAccount(req, {
    email: TEACHER_EMAIL,
    userId: TEACHER_USER_ID,
    metadata: { role: 'teacher', teacher_id: TEACHER_USER_ID, student_id: null, parent_id: null },
    redirectPath: '/teacher',
  });
}
