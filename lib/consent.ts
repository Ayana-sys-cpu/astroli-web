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

// Pure constants + types live in ./consent-constants (client-safe, no server
// imports). Re-exported here so existing server-side callers can keep importing
// them from '@/lib/consent' unchanged.
export {
  CURRENT_POLICY_VERSION,
  POLICY_EFFECTIVE_DATE,
  CONSENT_ITEMS,
  MANDATORY_ITEMS,
  CONSENT_ITEM_LABELS,
} from '@/lib/consent-constants';
import { CURRENT_POLICY_VERSION } from '@/lib/consent-constants';
export type { ConsentItem } from '@/lib/consent-constants';
import type { ConsentItem } from '@/lib/consent-constants';

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
