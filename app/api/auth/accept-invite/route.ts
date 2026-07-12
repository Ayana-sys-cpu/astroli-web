// POST /api/auth/accept-invite
//
// Called when a student arrives at /auth/accept-invite after the Supabase
// PKCE session was established in /auth/callback. No Google OAuth required —
// the student's email comes from their active session.
//
// Request:  POST { token: string }
// Response: 200 { role, userId, email, firstName, alienName, baseAvatarUrl, isNewStudent }
//           401 — no active session
//           404 — token not found
//           409 — token already accepted (client redirects to /syncing)
//           410 — token expired
//           422 — session email does not match invited email

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createSSRServerClient } from '@/lib/supabase-server';
import { z, parseBody } from '@/lib/validate';
import { toDisplayFirstName } from '@/lib/display-name';

const Schema = z.object({
  token: z.string().uuid('Invalid invite token'),
});

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.response;
  const { token } = parsed.data;

  // 1. Require an authenticated user (established via /auth/callback).
  // Two auth sources, tried in order — both verify the JWT server-side:
  //   a) Authorization: Bearer <access_token> — passed explicitly by the caller
  //      straight from the just-established session. This is race-proof: it does
  //      NOT depend on the auth cookie having propagated across the client-side
  //      navigation from /auth/callback (the source of intermittent failures).
  //   b) Cookie session — fallback for callers that rely on the SSR cookie.
  let user = null;
  const authHeader = req.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) {
      const { data } = await supabaseAdmin.auth.getUser(bearer);
      user = data.user ?? null;
    }
  }
  if (!user) {
    const supabase = createSSRServerClient();
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  }

  if (!user) {
    return NextResponse.json(
      { error: 'Not authenticated — please click the invite link from your email.' },
      { status: 401 },
    );
  }

  const email = user.email?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'No email in session.' }, { status: 401 });
  }

  // Name from invite metadata (set by inviteUserByEmail) or email prefix as
  // fallback — toDisplayFirstName keeps the fallback humane ("ayana.student.test" → "Ayana").
  const childName = (user.user_metadata?.childName as string | undefined)
    ?? email.split('@')[0];
  const nameParts = childName.split(' ');
  const firstName = toDisplayFirstName(nameParts[0] ?? '');

  // 2. Fetch and validate invite
  const { data: invite } = await supabaseAdmin
    .from('child_invites')
    .select('id, parent_id, child_email, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: 'Invite already accepted' }, { status: 409 });
  }
  if (new Date() > new Date(invite.expires_at)) {
    return NextResponse.json({ error: 'Invite link has expired — ask your parent to resend.' }, { status: 410 });
  }
  if (email !== invite.child_email.toLowerCase()) {
    return NextResponse.json(
      { error: 'This invite was sent to a different email address.' },
      { status: 422 },
    );
  }

  // 3. Create/upsert child users row
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id, first_name, alien_name, base_avatar_url')
    .eq('email', email)
    .maybeSingle();

  const isNewStudent = !existing || !existing.alien_name;

  const { data: child, error: childError } = await supabaseAdmin
    .from('users')
    .upsert(
      { email, role: 'student', full_name: childName, first_name: firstName },
      { onConflict: 'email' },
    )
    .select('id, first_name, alien_name, base_avatar_url')
    .single();

  if (childError || !child) {
    console.error('[accept-invite] upsert child error:', childError);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }

  const canonicalId   = existing?.id ?? child.id;
  const alienName     = 'Orin';
  const baseAvatarUrl = '/avatars/base/base-03.png';

  if (isNewStudent) {
    await supabaseAdmin
      .from('users')
      .update({ alien_name: alienName, base_avatar_url: baseAvatarUrl })
      .eq('id', canonicalId);
  }

  // 4. Create parent_child_link
  const { error: linkError } = await supabaseAdmin
    .from('parent_child_link')
    .upsert(
      { parent_id: invite.parent_id, child_id: canonicalId, role: 'owner' },
      { onConflict: 'parent_id,child_id', ignoreDuplicates: true },
    );

  if (linkError) {
    console.error('[accept-invite] parent_child_link error:', linkError);
    return NextResponse.json({ error: 'Failed to link account' }, { status: 500 });
  }

  // 5. Mark invite accepted
  await supabaseAdmin
    .from('child_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  // 6. Stamp user_metadata and link auth user to our users row
  const authUserId = user.id;
  await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    user_metadata: { role: 'student', student_id: canonicalId, teacher_id: null, parent_id: null },
  });
  await supabaseAdmin.from('users').update({ auth_user_id: authUserId }).eq('id', canonicalId);

  return NextResponse.json({
    role:         'student',
    userId:       canonicalId,
    email,
    firstName,
    alienName,
    baseAvatarUrl,
    isNewStudent,
  });
}
