// Shared one-click dev sign-in used by /api/auth/dev-teacher-login and
// /api/auth/dev-parent-login. Dev-only — both routes 403 in production.
//
// The whole flow runs server-side: generate a magic link, exchange its hashed
// token for a session, stamp role metadata, refresh the session so the JWT
// carries that metadata, write the session cookies, and redirect on the same
// origin as the request.
//
// Three hard-won constraints (each caused silent login failures before):
// - The browser must never bounce through Supabase's verify redirect —
//   localhost is not in the project's redirect allow-list, so Supabase strands
//   the browser on the production site URL instead of returning to localhost.
// - Metadata is stamped AFTER verifyOtp consumes the token: updating the auth
//   user invalidates outstanding OTPs, so stamping between generateLink and
//   verification kills the fresh link (otp_expired).
// - The user id comes from verifyOtp's response, never from admin listUsers —
//   that API intermittently 500s, which used to skip the stamp silently and
//   log the founder in with whatever role the account last had.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin, supabaseAnon, createSSRServerClient } from './supabase-server';

export type DevAccount = {
  email: string;
  /** users.id row to stamp into metadata and link via auth_user_id. */
  userId: string;
  metadata: {
    role: 'teacher' | 'parent';
    teacher_id: string | null;
    parent_id: string | null;
    student_id: null;
  };
  /** Landing page after sign-in, e.g. '/teacher'. */
  redirectPath: string;
};

export async function signInDevAccount(req: NextRequest, account: DevAccount): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  // 1. Generate a magic link — we only need its hashed token, never the URL.
  //    (Also creates the auth user on first login for this email.)
  const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: account.email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkErr || !tokenHash) {
    return NextResponse.json(
      { error: 'Failed to generate link', detail: linkErr?.message },
      { status: 500 },
    );
  }

  // 2. Exchange the token for a session server-side.
  const { data: verified, error: verifyErr } = await supabaseAnon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  });
  if (verifyErr || !verified.session || !verified.user) {
    return NextResponse.json(
      { error: 'Failed to verify login token', detail: verifyErr?.message },
      { status: 500 },
    );
  }

  // 3. Stamp role metadata. Unused role ids are nulled explicitly — the
  //    founder account doubles as teacher and parent across flows.
  await supabaseAdmin.auth.admin.updateUserById(verified.user.id, {
    user_metadata: account.metadata,
  });

  // 4. Refresh so the access token's claims carry the stamped metadata too
  //    (server-side getUser() would already see it; client-side session reads
  //    would not). If the refresh flakes, the original tokens still work.
  const { data: refreshed } = await supabaseAnon.auth.refreshSession({
    refresh_token: verified.session.refresh_token,
  });
  const session = refreshed?.session ?? verified.session;

  // 5. Persist the session to cookies for this origin.
  const supabase = createSSRServerClient();
  await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  // 6. Link the auth user to the users row (idempotent, mirrors finalize-login).
  await supabaseAdmin
    .from('users')
    .update({ auth_user_id: verified.user.id })
    .eq('id', account.userId);

  return NextResponse.redirect(new URL(account.redirectPath, req.url));
}
