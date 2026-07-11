// GET /api/auth/dev-parent-login
//
// Temporary dev-only endpoint. Generates a Supabase magic link for the
// parent reviewer account and redirects through it — no button clicks required.
// The user flows: this route → Supabase verify → /auth/callback → /parent.
// DELETE this file before going to production.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// The parent reviewer test account. This user is in authorized_parents,
// has a child linked in parent_child_link, and is NOT also a teacher
// (ayana6@gmail.com is both teacher + parent — finalize-login would pick teacher).
const PARENT_EMAIL   = 'astroli.parent.reviewer@gmail.com';
const PARENT_USER_ID = 'ec6c4710-3b4b-4920-967a-b3e8424fbaa8'; // users.id

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001';

  // 1. Stamp parent metadata on the auth user (if one exists for this email).
  //    generateLink doesn't reliably update existing users' raw_user_meta_data,
  //    and listUsers is more reliable than depending on generateLink's return value.
  const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const existingAuthUser = authUsers.find((u) => u.email?.toLowerCase() === PARENT_EMAIL.toLowerCase());
  if (existingAuthUser) {
    await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
      user_metadata: { role: 'parent', parent_id: PARENT_USER_ID, student_id: null, teacher_id: null },
    });
  }

  // 2. Generate the magic link (creates the Supabase auth user if none exists yet).
  const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: PARENT_EMAIL,
    options: {
      redirectTo: `${base}/auth/callback`,
      data: { role: 'parent', parent_id: PARENT_USER_ID, student_id: null, teacher_id: null },
    },
  });

  if (linkErr || !link) {
    return NextResponse.json({ error: 'Failed to generate link', detail: linkErr?.message }, { status: 500 });
  }

  // 3. If Supabase just created the auth user, stamp metadata on them too.
  const newAuthUserId = (link as any).user?.id as string | undefined;
  if (newAuthUserId && !existingAuthUser) {
    await supabaseAdmin.auth.admin.updateUserById(newAuthUserId, {
      user_metadata: { role: 'parent', parent_id: PARENT_USER_ID, student_id: null, teacher_id: null },
    });
    // Also link the auth user to the users row so resolveParentId works.
    await supabaseAdmin
      .from('users')
      .update({ auth_user_id: newAuthUserId })
      .eq('id', PARENT_USER_ID);
  }

  const actionLink = (link.properties as any)?.action_link as string | undefined;
  if (!actionLink) {
    return NextResponse.json({ error: 'No action_link returned' }, { status: 500 });
  }

  return NextResponse.redirect(actionLink);
}
