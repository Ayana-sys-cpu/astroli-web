// GET /api/me/language
//
// The calling person's language. Deliberately tiny and role-agnostic: any
// authenticated surface that needs a language but has no journey context —
// student onboarding, the app chrome, Orin outside a journey — reads it here
// instead of inventing its own answer.
//
// Before this existed, such surfaces guessed. The student home page took the
// language of whichever journey happened to sort first, and Orin inherited that
// guess. See specs/shared/language/spec.md.
//
// Response: 200 { language: 'en' | 'he' }
//           401 — no session

import { NextResponse } from 'next/server';
import { requireAuth, resolveStudentId } from '@/lib/auth';
import { resolveUserLanguage } from '@/lib/student-language';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  // Student data is keyed by our users.id, not the auth uid — the two diverge
  // for magic-link accounts. Resolve the same way every other student route
  // does, falling back to the auth id for non-student roles.
  const userId = (await resolveStudentId(auth.user)) ?? auth.user.id;

  return NextResponse.json({ language: await resolveUserLanguage(userId) });
}
