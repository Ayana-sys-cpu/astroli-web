// Invite gate for brand-new sign-ups on the Astroli student app.
//
// The student app is invite-only. A child only gets an account because a
// parent invited them (child_invites) — that invite is the COPPA consent
// trail, so account creation must never happen without one. Anyone else who
// signs in is recorded on student_waitlist and turned away.
//
// App Review is the one exception: the reviewer signs in with an Apple ID no
// parent ever invited, so they'd hit the wall and reject us under guideline
// 2.2. REVIEWER_INVITE_CODE lets them past into the demo class. The code is an
// env var, never a literal in the repo, so it can be rotated after approval
// without a build.
//
// Only the student app is gated. The standalone Feed app shares
// /api/auth/apple but is not invite-only — callers pass `gated: false` for it.

import { timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase-server';

export type GateDecision =
  | { allow: true; via: 'reviewer' }
  | { allow: true; via: 'invite'; parentId: string; inviteId: string; childName: string | null }
  | { allow: false };

/** Constant-time compare so the reviewer code can't be probed byte by byte. */
function codeMatches(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Decides whether a brand-new email may become a student account.
 *
 * Returns `{ allow: false }` after recording the email on student_waitlist —
 * the caller should respond 403 with reason 'invite_required'. Never throws:
 * a waitlist write failure still denies access.
 */
export async function checkNewStudentAccess(opts: {
  email: string;
  provider: 'apple' | 'google';
  inviteCode?: string | null;
  firstName?: string | null;
}): Promise<GateDecision> {
  const { email, provider, inviteCode, firstName } = opts;

  // ── 1. App Review bypass ───────────────────────────────────────────────────
  const reviewerCode = process.env.REVIEWER_INVITE_CODE;
  if (reviewerCode && inviteCode && codeMatches(inviteCode.trim(), reviewerCode)) {
    console.log('[mobile-gate] reviewer code accepted for', email);
    return { allow: true, via: 'reviewer' };
  }

  // ── 2. A parent already invited this exact address ─────────────────────────
  // Accepting by email match (rather than by the emailed token) is safe and
  // deliberate: Apple/Google have just proved the signer owns this mailbox,
  // which is strictly stronger than possession of a link sent to it. It also
  // saves an invited child who opens the app before clicking the email.
  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('child_invites')
    .select('id, parent_id, child_name, expires_at, accepted_at')
    .eq('child_email', email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inviteError) {
    // Fail closed — never create a child account when we can't verify consent.
    console.error('[mobile-gate] invite lookup failed:', inviteError);
    return { allow: false };
  }

  if (invite) {
    return {
      allow: true,
      via: 'invite',
      parentId: invite.parent_id,
      inviteId: invite.id,
      childName: invite.child_name ?? null,
    };
  }

  // ── 3. Nobody invited them ─────────────────────────────────────────────────
  const { error: waitlistError } = await supabaseAdmin
    .from('student_waitlist')
    .upsert({ email, provider, first_name: firstName ?? null }, { onConflict: 'email', ignoreDuplicates: true });
  if (waitlistError) {
    console.error('[mobile-gate] waitlist upsert failed:', waitlistError);
  }
  return { allow: false };
}

/**
 * Side effects owed to a child who came in through an invite: link them to
 * their parent, burn the invite, and enroll them in whatever family class the
 * parent set up during onboarding. Mirrors steps 4–5b of
 * /api/auth/accept-invite so both doors leave identical state.
 *
 * Best-effort by design — the account already exists at this point, so a
 * failure here must not turn a successful sign-in into an error.
 */
export async function completeInvitedChildSetup(
  studentId: string,
  decision: Extract<GateDecision, { via: 'invite' }>,
): Promise<void> {
  const { error: linkError } = await supabaseAdmin
    .from('parent_child_link')
    .upsert(
      { parent_id: decision.parentId, child_id: studentId, role: 'owner' },
      { onConflict: 'parent_id,child_id', ignoreDuplicates: true },
    );
  if (linkError) {
    console.error('[mobile-gate] parent_child_link failed:', linkError);
    return;
  }

  await supabaseAdmin
    .from('child_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', decision.inviteId);

  const { data: familyClasses } = await supabaseAdmin
    .from('classes')
    .select('id, journey_id')
    .eq('teacher_id', decision.parentId)
    .eq('type', 'family');

  for (const cls of familyClasses ?? []) {
    const { error: enrollError } = await supabaseAdmin
      .from('student_classes')
      .insert({ student_id: studentId, class_id: cls.id, template_journey_id: cls.journey_id });
    // 23505 = the one-class-per-template partial index; already enrolled.
    if (enrollError && (enrollError as { code?: string }).code !== '23505') {
      console.error(`[mobile-gate] family-class enroll failed for ${studentId}:`, enrollError);
    }
  }
}
