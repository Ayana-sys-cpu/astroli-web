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

  // 2. Fetch and validate invite
  const { data: invite } = await supabaseAdmin
    .from('child_invites')
    .select('id, parent_id, child_email, child_name, expires_at, accepted_at')
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

  // The name the parent typed when inviting. The email prefix is only a
  // last-resort fallback for invites created before the name was collected —
  // it is what produced greetings like "Welcome back, Amirmakmal".
  const childName = invite.child_name?.trim() || email.split('@')[0];
  const firstName = toDisplayFirstName(childName.split(' ')[0] ?? '');

  // 3. Create/upsert child users row
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id, first_name, alien_name, base_avatar_url')
    .eq('email', email)
    .maybeSingle();

  // base_avatar_url is the onboarding-complete marker; alien_name is a
  // deprecated legacy fallback so pre-deprecation accounts aren't re-onboarded.
  const isNewStudent = !existing || !(existing.base_avatar_url || existing.alien_name);

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
  const baseAvatarUrl = '/avatars/base/base-03.png';

  if (isNewStudent) {
    await supabaseAdmin
      .from('users')
      .update({ base_avatar_url: baseAvatarUrl })
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

  // 5b. Auto-enroll child in any family class the parent created before the
  //     invite was accepted (parent picked a journey during onboarding Step 2).
  const { data: pendingClasses } = await supabaseAdmin
    .from('classes')
    .select('id, journey_id')
    .eq('teacher_id', invite.parent_id)
    .eq('type', 'family');

  if (pendingClasses && pendingClasses.length > 0) {
    for (const cls of pendingClasses) {
      const { data: alreadyEnrolled } = await supabaseAdmin
        .from('student_classes')
        .select('id')
        .eq('student_id', canonicalId)
        .eq('class_id', cls.id)
        .maybeSingle();

      if (!alreadyEnrolled) {
        const { error: enrollError } = await supabaseAdmin
          .from('student_classes')
          .insert({ student_id: canonicalId, class_id: cls.id, template_journey_id: cls.journey_id });

        if (enrollError) {
          // 23505 = one-per-template index: the child already holds a class on
          // this template (they became school-enrolled between invite and
          // accept — invites to school accounts are rejected upfront). The
          // family class stays empty; flag it so support can resolve.
          console.error(
            `[accept-invite] could not enroll child ${canonicalId} in family class ${cls.id}` +
            ` (template ${cls.journey_id}):`,
            enrollError,
          );
        }
      }
    }
  }

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
    baseAvatarUrl,
    isNewStudent,
  });
}
