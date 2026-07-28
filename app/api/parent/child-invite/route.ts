// POST /api/parent/child-invite
//
// Creates a child profile record and sends an invite email to the child's Gmail.
// The invite link contains a one-time UUID token that expires in 48 hours.
//
// Request:  POST { childEmail: string, childName?: string } — the display name
//           is derived from the email when absent; the child's real profile
//           name arrives from their Google account once they sign in.
// Response: 200 { ok: true, inviteId: string }
//           400 — missing/invalid fields
//           401 — no session
//           403 — not a parent session
//           409 — parent already has a linked child
//           422 — child email belongs to an existing teacher or school student

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { resolveParentId } from '@/lib/parent-auth';
import { z, parseBody } from '@/lib/validate';
import { sendInviteEmail } from '@/lib/email';
import { hasCurrentConsent } from '@/lib/consent';
import { toDisplayFirstName } from '@/lib/display-name';

const Schema = z.object({
  childEmail: z.string().email('Invalid email address').toLowerCase(),
  childName:  z.string().trim().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parentId = resolveParentId(auth.user);
  if (!parentId) {
    return NextResponse.json({ error: 'Forbidden: parent session required' }, { status: 403 });
  }

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.response;
  const { childEmail, childName } = parsed.data;

  // Consent gate (defense-in-depth). The onboarding UI shows the consent step
  // before this call, but no invite may EVER be dispatched — and therefore no
  // child may sign in — without a current-version parental consent on file for
  // this child. 428 Precondition Required signals the client to show consent.
  const consented = await hasCurrentConsent(parentId, childEmail);
  if (!consented) {
    return NextResponse.json(
      { error: 'Parental consent is required before inviting your child.', code: 'consent_required' },
      { status: 428 },
    );
  }

  // One child per parent (v1 limit)
  const { data: existingLink } = await supabaseAdmin
    .from('parent_child_link')
    .select('child_id')
    .eq('parent_id', parentId)
    .maybeSingle();

  if (existingLink) {
    return NextResponse.json({ error: 'You already have a linked child' }, { status: 409 });
  }

  // Reject if child email is already a teacher or school-enrolled student
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('email', childEmail)
    .maybeSingle();

  if (existingUser && (existingUser.role === 'teacher' || existingUser.role === 'student')) {
    return NextResponse.json(
      { error: 'This email is linked to a school account — contact support.' },
      { status: 422 },
    );
  }

  // Insert invite row — generates a fresh UUID token automatically.
  // child_name is carried here because it is the only record of the child's real
  // name until they accept: magic-link signup never yields a Google profile, so
  // without it accept-invite falls back to the email prefix.
  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('child_invites')
    .insert({ parent_id: parentId, child_email: childEmail, child_name: childName ?? null })
    .select('id, token')
    .single();

  if (inviteError || !invite) {
    console.error('[parent/child-invite] insert error:', inviteError);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }

  // Send invite email via Resend. The link points to /auth/accept-invite (our
  // client page) which calls /api/auth/create-invite-session at click time to
  // generate a fresh Supabase magic-link. This avoids the old single-use OTP
  // problem: Supabase's link is generated at click time, not at send time, so
  // resends never invalidate previous emails and email scanners can't consume
  // the token (they don't execute JavaScript).
  try {
    await sendInviteEmail(childEmail, childName ?? toDisplayFirstName(childEmail), invite.token);
  } catch (err) {
    console.error('[parent/child-invite] Resend error:', err);
    // Don't fail the request — the invite row exists; parent can resend from dashboard.
  }

  return NextResponse.json({ ok: true, inviteId: invite.id });
}
