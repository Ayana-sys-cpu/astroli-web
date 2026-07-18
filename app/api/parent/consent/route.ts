// /api/parent/consent
//
// POST — record an append-only parental-consent event for the current policy
//        version. Gates the child invite (see child-invite/route.ts).
// GET  — current consent status for the parent (drives the onboarding step and
//        the existing-parent back-fill).
//
// Request (POST): { childEmail: string, items: string[] }
// Response (POST): 200 { ok, consentId, policyVersion }
//                  400 — invalid/unknown items, missing mandatory item, bad email
//                  401 — no session · 403 — not a parent · 500 — insert failure
// Response (GET):  200 { policyVersion, hasCurrentConsent, consentedItems, needsReconsent }

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { resolveParentId } from '@/lib/parent-auth';
import { z, parseBody } from '@/lib/validate';
import {
  CURRENT_POLICY_VERSION,
  CONSENT_ITEMS,
  MANDATORY_ITEMS,
  getConsentStatus,
  type ConsentItem,
} from '@/lib/consent';

const Schema = z.object({
  childEmail: z.string().email('Invalid email address').toLowerCase(),
  // Only the items live on the current screen are accepted; unknown items 400.
  items: z
    .array(z.enum(CONSENT_ITEMS as [ConsentItem, ...ConsentItem[]]))
    .min(1, 'At least one consent item is required'),
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
  const { childEmail, items } = parsed.data;

  // Every mandatory item must be present. (voice_processing is declinable and is
  // not in CONSENT_ITEMS today, so this simply requires ai_companion + data_storage.)
  const missing = MANDATORY_ITEMS.filter(m => !items.includes(m));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Consent to all required items before continuing.` },
      { status: 400 },
    );
  }

  const userAgent = req.headers.get('user-agent')?.slice(0, 400) ?? null;

  // Append-only: always INSERT a new row. Re-consent leaves prior rows intact.
  const { data: consent, error } = await supabaseAdmin
    .from('parent_consents')
    .insert({
      parent_id:      parentId,
      child_email:    childEmail,
      policy_version: CURRENT_POLICY_VERSION,
      consent_items:  items,
      user_agent:     userAgent,
    })
    .select('id')
    .single();

  if (error || !consent) {
    console.error('[parent/consent] insert error:', error);
    return NextResponse.json({ error: 'Failed to record consent' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    consentId: consent.id,
    policyVersion: CURRENT_POLICY_VERSION,
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parentId = resolveParentId(auth.user);
  if (!parentId) {
    return NextResponse.json({ error: 'Forbidden: parent session required' }, { status: 403 });
  }

  const childEmail = req.nextUrl.searchParams.get('childEmail') ?? undefined;
  const status = await getConsentStatus(parentId, childEmail);
  return NextResponse.json(status);
}
