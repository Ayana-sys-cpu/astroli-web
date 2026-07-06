/**
 * GET /auth/callback
 *
 * Handles the Supabase magic-link redirect. When a user clicks a sign-in link
 * from their email, Supabase redirects here with a one-time auth code.
 *
 * Steps:
 *  1. Exchange the code for a session (written to cookies via createSSRServerClient).
 *  2. Check whether the email is in the authorized_teachers whitelist.
 *  3. Look up the user record in our users table.
 *  4. Stamp user_metadata with { role, student_id / teacher_id } — mirrors the
 *     Google SSO path so all session-reading helpers work identically.
 *  5. Redirect to the appropriate landing page.
 *
 * Error redirects (all land back at /?error=<code> so the login page can
 * surface a friendly message):
 *   invalid_link   — code is missing, already used, or expired
 *   not_registered — email is not in our users table (must sign up via Google)
 *   service_error  — Supabase error during whitelist / user lookup
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSSRServerClient, supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=invalid_link`);
  }

  // Exchange the one-time code for a Supabase session stored in cookies.
  const supabase = createSSRServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error?.message);
    return NextResponse.redirect(`${origin}/?error=invalid_link`);
  }

  const authUserId = data.session.user.id;
  const email     = data.session.user.email?.toLowerCase();

  if (!email) {
    return NextResponse.redirect(`${origin}/?error=invalid_link`);
  }

  // ── Whitelist check — fail closed on DB error ─────────────────────────────
  const { data: whitelist, error: whitelistError } = await supabaseAdmin
    .from('authorized_teachers')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  if (whitelistError) {
    console.error('[auth/callback] whitelist lookup error:', whitelistError.message);
    return NextResponse.redirect(`${origin}/?error=service_error`);
  }

  const isTeacher = whitelist !== null;

  // ── User record lookup ────────────────────────────────────────────────────
  const { data: userRecord, error: userError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (userError) {
    console.error('[auth/callback] user lookup error:', userError.message);
    return NextResponse.redirect(`${origin}/?error=service_error`);
  }

  if (!userRecord) {
    // Email not in our system — must register via Google first.
    return NextResponse.redirect(`${origin}/?error=not_registered`);
  }

  // ── Stamp user_metadata (mirrors the Google SSO path) ────────────────────
  const metadata = isTeacher
    ? { role: 'teacher', teacher_id: userRecord.id, student_id: null }
    : { role: 'student',  student_id: userRecord.id, teacher_id: null };

  await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    user_metadata: metadata,
  });

  // Link the Supabase Auth user to our users row (idempotent).
  await supabaseAdmin
    .from('users')
    .update({ auth_user_id: authUserId })
    .eq('user_id', userRecord.id);

  return NextResponse.redirect(`${origin}${isTeacher ? '/teacher' : '/syncing'}`);
}
