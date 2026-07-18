// Parental consent — shared constants + server-side status helpers.
//
// Spec:     specs/parent/web-app/parental-consent/spec.md
// Contract: specs/parent/web-app/parental-consent/contracts/consent-api.md
//
// "Current consent" is derived at read time, never stored as a boolean:
// a parent has current consent for a child when a parent_consents row exists
// with policy_version === CURRENT_POLICY_VERSION and withdrawn_at IS NULL,
// matched by child_id OR child_email. See data-model.md.

import { supabaseAdmin } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Policy version — the single live edition. Advance this (and publish the new
// legal docs) whenever the Terms or Privacy Policy materially change, e.g. when
// voice ships. A parent whose latest consent predates this value is re-prompted.
//
// NOTE: astorli-bot has its own copy of this string in lib/parent-consent.ts —
// keep the two in sync when you advance the version.
// ---------------------------------------------------------------------------
export const CURRENT_POLICY_VERSION = '2026-07-17';
export const POLICY_EFFECTIVE_DATE  = 'July 17, 2026';

export type ConsentItem = 'ai_companion' | 'data_storage' | 'voice_processing';

// Items shown on the LIVE consent screen today. voice_processing is a valid
// model item (stored once voice ships) but is deliberately absent here so the
// flow stays two short points until the voice feature is enabled.
export const CONSENT_ITEMS: ConsentItem[] = ['ai_companion', 'data_storage'];

// All of these must be present for a consent to count. voice_processing is
// independently declinable, so it is never mandatory.
export const MANDATORY_ITEMS: ConsentItem[] = ['ai_companion', 'data_storage'];

// Plain-English labels for the consent screen (and future voice line).
export const CONSENT_ITEM_LABELS: Record<ConsentItem, string> = {
  ai_companion:
    'My child can chat with an AI companion (Orin) as part of their learning.',
  data_storage:
    "My child's conversations and learning progress are stored so they can pick up where they left off.",
  voice_processing:
    "My child's voice can be recorded and sent to a speech provider so they can talk with the AI (text still works if you decline).",
};

type ConsentRow = {
  policy_version: string;
  consent_items: string[];
  withdrawn_at: string | null;
  consented_at: string;
};

// Latest non-withdrawn consent row for this parent + child (by id or email).
async function latestConsent(
  parentId: string,
  childEmail?: string,
): Promise<ConsentRow | null> {
  let query = supabaseAdmin
    .from('parent_consents')
    .select('policy_version, consent_items, withdrawn_at, consented_at')
    .eq('parent_id', parentId)
    .is('withdrawn_at', null)
    .order('consented_at', { ascending: false })
    .limit(1);

  if (childEmail) query = query.eq('child_email', childEmail.toLowerCase());

  const { data } = await query.maybeSingle();
  return (data as ConsentRow | null) ?? null;
}

// True iff a current-version, non-withdrawn consent exists for this parent+child.
export async function hasCurrentConsent(
  parentId: string,
  childEmail?: string,
): Promise<boolean> {
  const row = await latestConsent(parentId, childEmail);
  return !!row && row.policy_version === CURRENT_POLICY_VERSION;
}

// Items on the CURRENT-version consent row ([] if none / stale). This is the
// per-item gate other features consume — a future voice check asks whether the
// result includes 'voice_processing'. A stale row (older version) returns [],
// so voice reads as not-consented until the parent re-consents.
export async function currentConsentItems(
  parentId: string,
  childEmail?: string,
): Promise<ConsentItem[]> {
  const row = await latestConsent(parentId, childEmail);
  if (!row || row.policy_version !== CURRENT_POLICY_VERSION) return [];
  return row.consent_items.filter(
    (i): i is ConsentItem =>
      i === 'ai_companion' || i === 'data_storage' || i === 'voice_processing',
  );
}

// Consent status for the onboarding step + existing-parent back-fill.
export type ConsentStatus = {
  policyVersion: string;
  hasCurrentConsent: boolean;
  consentedItems: ConsentItem[];
  needsReconsent: boolean;
};

export async function getConsentStatus(
  parentId: string,
  childEmail?: string,
): Promise<ConsentStatus> {
  const row = await latestConsent(parentId, childEmail);
  const current = !!row && row.policy_version === CURRENT_POLICY_VERSION;
  return {
    policyVersion: CURRENT_POLICY_VERSION,
    hasCurrentConsent: current,
    consentedItems: current
      ? row!.consent_items.filter(
          (i): i is ConsentItem =>
            i === 'ai_companion' || i === 'data_storage' || i === 'voice_processing',
        )
      : [],
    // A prior consent exists but at an older version → re-consent required.
    needsReconsent: !!row && !current,
  };
}
