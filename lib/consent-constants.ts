// Parental consent — pure constants + types, safe to import from client
// components. This module MUST NOT import anything server-only (no
// supabase-server / next/headers), because client components (ConsentStep,
// LegalDoc) import it into the browser bundle. The server-side status helpers
// live in ./consent, which re-exports everything here for server callers.
//
// Spec: specs/parent/web-app/parental-consent/spec.md

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
