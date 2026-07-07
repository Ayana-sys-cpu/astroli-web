// POST /api/auth/accept-invite
//
// Called when a child clicks the invite link and completes Google OAuth.
// Validates the one-time token + email match, creates the child's users row,
// links them to the parent via parent_child_link, and returns a child session.
//
// Request:  POST { token: string, accessToken: string }
// Response: 200 { role, userId, email, name, authToken }
//           404 — token not found
//           409 — token already accepted
//           410 — token expired (> 48h)
//           422 — Google account email does not match invited email

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { z, parseBody } from '@/lib/validate';

const Schema = z.object({
  token:       z.string().uuid('Invalid invite token'),
  accessToken: z.string().min(1, 'Google access token required'),
});

async function upsertAuthUserAndToken(
  email: string,
  metadata: { role: string; student_id: string; parent_id?: null; teacher_id?: null },
) {
  const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
    type:    'magiclink',
    email,
    options: { data: metadata },
  });
  if (error || !link) return null;

  const hashed_token = (link.properties as { hashed_token?: string }).hashed_token;
  const authUserId   = (link as any).user?.id as string | undefined;
  if (!hashed_token || !authUserId) return null;

  await supabaseAdmin.auth.admin.updateUserById(authUserId, { user_metadata: metadata });
  return { authUserId, authToken: hashed_token };
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.response;
  const { token, accessToken } = parsed.data;

  // 1. Resolve Google identity from access token
  const profileRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch Google profile' }, { status: 401 });
  }
  const { email: rawEmail, name } = await profileRes.json();
  if (!rawEmail) {
    return NextResponse.json({ error: 'Google did not return an email' }, { status: 401 });
  }
  const email = rawEmail.toLowerCase();
  const nameParts = (name ?? '').split(' ');

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

  // 3. Create child users row
  const { data: child, error: childError } = await supabaseAdmin
    .from('users')
    .upsert(
      { email, role: 'student', full_name: name ?? '', first_name: nameParts[0] ?? '' },
      { onConflict: 'email' },
    )
    .select('id')
    .single();

  if (childError || !child) {
    console.error('[accept-invite] upsert child error:', childError);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }

  // 4. Create parent_child_link
  const { error: linkError } = await supabaseAdmin
    .from('parent_child_link')
    .upsert(
      { parent_id: invite.parent_id, child_id: child.id, role: 'owner' },
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

  // 6. Create Supabase auth session for child
  const authResult = await upsertAuthUserAndToken(email, {
    role:       'student',
    student_id: child.id,
    teacher_id: null,
    parent_id:  null,
  });

  if (!authResult) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }

  await supabaseAdmin.from('users').update({ auth_user_id: authResult.authUserId }).eq('id', child.id);

  return NextResponse.json({
    role:      'student',
    userId:    child.id,
    email,
    name,
    authToken: authResult.authToken,
  });
}
