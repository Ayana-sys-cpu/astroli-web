// POST /api/parent/child-invite
//
// Creates a child profile record and sends an invite email to the child's Gmail.
// The invite link contains a one-time UUID token that expires in 48 hours.
//
// Request:  POST { childEmail: string, childName: string }
// Response: 200 { ok: true, inviteId: string }
//           400 — missing/invalid fields
//           401 — no session
//           403 — not a parent session
//           409 — parent already has a linked child
//           422 — child email belongs to an existing teacher or school student

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAnon } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { resolveParentId } from '@/lib/parent-auth';
import { z, parseBody } from '@/lib/validate';

const Schema = z.object({
  childEmail: z.string().email('Invalid email address').toLowerCase(),
  childName:  z.string().trim().min(1, 'Child name is required'),
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

  // Insert invite row — generates a fresh UUID token automatically
  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('child_invites')
    .insert({ parent_id: parentId, child_email: childEmail })
    .select('id, token')
    .single();

  if (inviteError || !invite) {
    console.error('[parent/child-invite] insert error:', inviteError);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }

  // Send invite email via Supabase — inviteUserByEmail actually delivers the email,
  // unlike generateLink which only returns a URL without sending anything.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001';
  // Route through /auth/callback so the PKCE code is exchanged server-side and
  // the session is established before the student reaches /auth/accept-invite.
  // The invite token is carried in user_metadata (data.inviteToken) for the
  // inviteUserByEmail path, and in the URL (?invite=) for the OTP fallback.
  const callbackUrl   = `${baseUrl}/auth/callback`;
  const otpCallbackUrl = `${baseUrl}/auth/callback?invite=${invite.token}`;

  const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(childEmail, {
    redirectTo: callbackUrl,
    data:       { childName, inviteToken: invite.token },
  });

  if (emailError) {
    if ((emailError as any).status === 422) {
      // User already confirmed — inviteUserByEmail refuses them. Fall back to magic link.
      const { error: otpError } = await supabaseAnon.auth.signInWithOtp({
        email:   childEmail,
        options: { shouldCreateUser: false, emailRedirectTo: otpCallbackUrl },
      });
      if (otpError) console.error('[parent/child-invite] OTP fallback error:', otpError);
    } else {
      console.error('[parent/child-invite] invite email error:', emailError);
    }
  }

  return NextResponse.json({ ok: true, inviteId: invite.id });
}
