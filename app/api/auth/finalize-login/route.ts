// POST /api/auth/finalize-login
//
// Completes a NON-invite magic-link sign-in (dev-login, teacher whitelist).
// By the time this is called, the client-side /auth/callback page has already
// persisted the Supabase session to cookies via setSession(), so getUser()
// verifies the JWT here and we can stamp user_metadata + pick a landing page.
//
// Invite links do NOT hit this route — they go straight to /auth/accept-invite.
//
// Response: 200 { redirect: '/teacher' | '/parent' | '/syncing' }
//           401 { error: 'invalid_link' }    — no valid session
//           404 { error: 'not_registered' }  — email not in our users table
//           500 { error: 'service_error' }   — DB error during lookup

import { NextResponse } from 'next/server';
import { supabaseAdmin, createSSRServerClient } from '@/lib/supabase-server';

export async function POST() {
  const supabase = createSSRServerClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: 'invalid_link' }, { status: 401 });
  }

  const email = user.email?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'invalid_link' }, { status: 401 });
  }

  // ── Whitelist checks (teacher + parent) — fail closed on DB error ──────────
  const [
    { data: teacherWhitelist, error: teacherWhitelistError },
    { data: parentWhitelist,  error: parentWhitelistError  },
  ] = await Promise.all([
    supabaseAdmin.from('authorized_teachers').select('email').eq('email', email).maybeSingle(),
    supabaseAdmin.from('authorized_parents').select('email').eq('email', email).maybeSingle(),
  ]);

  if (teacherWhitelistError) {
    console.error('[finalize-login] teacher whitelist lookup error:', teacherWhitelistError.message);
    return NextResponse.json({ error: 'service_error' }, { status: 500 });
  }
  if (parentWhitelistError) {
    console.error('[finalize-login] parent whitelist lookup error:', parentWhitelistError.message);
    return NextResponse.json({ error: 'service_error' }, { status: 500 });
  }

  const isTeacher = teacherWhitelist !== null;
  // Also trust role=parent already stamped via admin API (e.g. dev-parent-login)
  const isParent  = parentWhitelist !== null
    || (user.user_metadata?.role === 'parent' && !!user.user_metadata?.parent_id);

  // ── User record lookup ────────────────────────────────────────────────────
  const { data: userRecord, error: lookupError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (lookupError) {
    console.error('[finalize-login] user lookup error:', lookupError.message);
    return NextResponse.json({ error: 'service_error' }, { status: 500 });
  }

  if (!userRecord) {
    return NextResponse.json({ error: 'not_registered' }, { status: 404 });
  }

  // ── Stamp user_metadata (mirrors the Google SSO path) ────────────────────
  const metadata = isTeacher
    ? { role: 'teacher', teacher_id: userRecord.id, student_id: null, parent_id: null }
    : isParent
      ? { role: 'parent',  parent_id: userRecord.id,  student_id: null, teacher_id: null }
      : { role: 'student', student_id: userRecord.id, teacher_id: null, parent_id: null };

  await supabaseAdmin.auth.admin.updateUserById(user.id, { user_metadata: metadata });

  // Link the Supabase Auth user to our users row (idempotent).
  await supabaseAdmin
    .from('users')
    .update({ auth_user_id: user.id })
    .eq('id', userRecord.id);

  const redirect = isTeacher ? '/teacher' : isParent ? '/parent' : '/syncing';
  return NextResponse.json({ redirect });
}
