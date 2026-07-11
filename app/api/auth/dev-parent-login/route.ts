// GET /api/auth/dev-parent-login
//
// Temporary dev-only endpoint. Signs the parent reviewer account in with one
// click and lands on /parent. DELETE this file before going to production.
// Flow and constraints: see lib/dev-login.ts.

import type { NextRequest } from 'next/server';
import { signInDevAccount } from '@/lib/dev-login';

// The parent reviewer test account. This user is in authorized_parents,
// has a child linked in parent_child_link, and is NOT also a teacher
// (ayana6@gmail.com is both teacher + parent — finalize-login would pick teacher).
const PARENT_EMAIL = 'astroli.parent.reviewer@gmail.com';
const PARENT_USER_ID = 'ec6c4710-3b4b-4920-967a-b3e8424fbaa8'; // users.id

export async function GET(req: NextRequest) {
  return signInDevAccount(req, {
    email: PARENT_EMAIL,
    userId: PARENT_USER_ID,
    metadata: { role: 'parent', parent_id: PARENT_USER_ID, student_id: null, teacher_id: null },
    redirectPath: '/parent/dashboard',
  });
}
