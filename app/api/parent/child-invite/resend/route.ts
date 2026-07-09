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
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { resolveParentId } from '@/lib/parent-auth';
import { sendInviteEmail } from '@/lib/email';

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

  try {
    await sendInviteEmail(lastInvite.child_email, lastInvite.child_email.split('@')[0], newInvite.token);
  } catch (err) {
    console.error('[child-invite/resend] Resend error:', err);
  }

  return NextResponse.json({ ok: true });
}
