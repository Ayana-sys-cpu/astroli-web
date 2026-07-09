// POST /api/auth/create-invite-session
//
// Called by AcceptInviteContent when a student clicks our Resend invite link.
// No auth required — the invite token IS the proof of identity.
//
// Flow:
//   1. Validate our invite token (child_invites table)
//   2. supabaseAdmin.auth.admin.generateLink({ type:'magiclink', email })
//      → Supabase creates or finds the user, returns a one-time action_link
//   3. Client redirects to action_link
//      → Supabase processes → redirects to /auth/callback?invite=TOKEN#access_token=…
//   4. CallbackContent.tsx reads fragment, calls /api/auth/accept-invite (as usual)
//
// Why this is bulletproof vs the old inviteUserByEmail approach:
//   - The Supabase link is generated AT CLICK TIME, not at invite-send time
//   - The link is never in an email, so email scanners can't pre-consume it
//   - Resending just creates a new child_invites row; old tokens stay valid
//   - The client page requires JavaScript, so scanners never hit this endpoint
//
// Request:  POST { token: string }
// Response: 200 { actionLink: string }
//           404 — token not found
//           409 — already accepted
//           410 — expired
//           500 — session generation failed

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { z, parseBody } from '@/lib/validate';

const Schema = z.object({
  token: z.string().uuid('Invalid invite token'),
});

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.response;
  const { token } = parsed.data;

  // 1. Validate the invite
  const { data: invite } = await supabaseAdmin
    .from('child_invites')
    .select('id, child_email, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found.' }, { status: 404 });
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: 'Invite already accepted.', alreadyAccepted: true }, { status: 409 });
  }
  if (new Date() > new Date(invite.expires_at)) {
    return NextResponse.json(
      { error: 'Invite link has expired — ask your parent to resend.' },
      { status: 410 },
    );
  }

  const email = invite.child_email.toLowerCase();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://app.astroli.ai';

  // redirectTo must be EXACTLY on the Supabase allowlist — no query params.
  // We pass the invite token via options.data (sets user_metadata on the auth
  // user) so CallbackContent can read it from the setSession() response.
  const redirectTo = `${baseUrl}/auth/callback`;

  // 2. Generate a fresh Supabase magic-link session. generateLink works for
  //    both new users (Supabase creates them) and returning ones.
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo, data: { inviteToken: token } },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[create-invite-session] generateLink error:', linkError);
    return NextResponse.json({ error: 'Failed to create session. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ actionLink: linkData.properties.action_link });
}
