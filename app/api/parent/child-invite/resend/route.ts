// POST /api/parent/child-invite/resend
//
// Invalidates the parent's most recent pending/expired invite and issues a new one.
// The parent is identified from their session — no body required.
//
// Response: 200 { ok: true }
//           401 — no session
//           403 — not a parent session
//           404 — no pending invite found

import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAnon } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { resolveParentId } from '@/lib/parent-auth';

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parentId = resolveParentId(auth.user);
  if (!parentId) {
    return NextResponse.json({ error: 'Forbidden: parent session required' }, { status: 403 });
  }

  // Find the most recent pending invite for this parent
  const { data: lastInvite } = await supabaseAdmin
    .from('child_invites')
    .select('id, child_email, token, created_at')
    .eq('parent_id', parentId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastInvite) {
    return NextResponse.json({ error: 'No pending invite found' }, { status: 404 });
  }

  // Rate-limit: refuse resend within 60 seconds of the last one
  const secondsSinceLast = (Date.now() - new Date(lastInvite.created_at).getTime()) / 1000;
  if (secondsSinceLast < 60) {
    return NextResponse.json({ error: 'Please wait a moment before resending.' }, { status: 429 });
  }

  // Insert a new invite row (fresh token + new 48h expiry)
  const { data: newInvite, error: insertError } = await supabaseAdmin
    .from('child_invites')
    .insert({ parent_id: parentId, child_email: lastInvite.child_email })
    .select('token')
    .single();

  if (insertError || !newInvite) {
    console.error('[child-invite/resend] insert error:', insertError);
    return NextResponse.json({ error: 'Failed to create new invite' }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001';
  const acceptUrl = `${baseUrl}/auth/accept-invite?token=${newInvite.token}`;

  const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    lastInvite.child_email,
    { redirectTo: acceptUrl, data: { inviteToken: newInvite.token } },
  );

  if (emailError) {
    if ((emailError as any).status === 422) {
      // User already confirmed — fall back to magic link.
      const { error: otpError } = await supabaseAnon.auth.signInWithOtp({
        email:   lastInvite.child_email,
        options: { shouldCreateUser: false, emailRedirectTo: acceptUrl },
      });
      if (otpError) console.error('[child-invite/resend] OTP fallback error:', otpError);
    } else {
      console.error('[child-invite/resend] invite email error:', emailError);
    }
  }

  return NextResponse.json({ ok: true });
}
