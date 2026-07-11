// GET /api/auth/dev-teacher-login
//
// Temporary dev-only endpoint. Generates a Supabase magic link for the teacher
// account and redirects the browser through it — no button clicks required.
// The user flows: this route → Supabase verify → /auth/callback → /teacher.
// DELETE this file before going to production.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

const TEACHER_EMAIL = 'ayana6@gmail.com';
const TEACHER_USER_ID = 'd16a01aa-f098-473c-a022-8e7dc66d58ac';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001';

  // 1. Generate a magic link with teacher metadata embedded
  const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: TEACHER_EMAIL,
    options: {
      redirectTo: `${base}/auth/callback`,
      data: { role: 'teacher', teacher_id: TEACHER_USER_ID, student_id: null },
    },
  });

  if (linkErr || !link) {
    return NextResponse.json({ error: 'Failed to generate link', detail: linkErr?.message }, { status: 500 });
  }

  // 2. Ensure metadata is up to date on the auth user (generateLink doesn't
  //    reliably update existing users' raw_user_meta_data)
  const authUserId = (link as any).user?.id as string | undefined;
  if (authUserId) {
    await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      user_metadata: { role: 'teacher', teacher_id: TEACHER_USER_ID, student_id: null },
    });
  }

  // 3. Redirect the browser to the Supabase action link.
  //    Supabase verifies the token and redirects to /auth/callback with the
  //    session in the URL fragment. The callback page picks it up and finalises
  //    the sign-in, then redirects to /teacher.
  const actionLink = (link.properties as any)?.action_link as string | undefined;
  if (!actionLink) {
    return NextResponse.json({ error: 'No action_link returned' }, { status: 500 });
  }

  return NextResponse.redirect(actionLink);
}
