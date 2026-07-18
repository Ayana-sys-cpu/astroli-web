-- =============================================================================
-- Parental Consent & Legal Agreements
-- Spec:       specs/parent/web-app/parental-consent/spec.md
-- Data model: specs/parent/web-app/parental-consent/data-model.md
--
-- All changes are ADDITIVE. Nothing is dropped or renamed.
-- Apply in Supabase SQL Editor or via supabase db push.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- parent_consents
-- Append-only record of every parental-consent event. Never updated or deleted
-- in normal operation; a re-consent (e.g. after a policy version bump) inserts a
-- NEW row and leaves prior rows untouched. "Current consent" is DERIVED at read
-- time (latest row at CURRENT_POLICY_VERSION with withdrawn_at IS NULL) — there
-- is deliberately no mutable "is consented" boolean that could drift.
--
-- child_id is NULLable on purpose: consent is captured BEFORE the child account
-- exists (consent gates the invite dispatch), so child_email is the durable link
-- until the child accepts and a users row exists to point child_id at.
-- No IP is stored (COPPA data-minimisation); user_agent is optional light audit.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parent_consents (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id      TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id       TEXT        REFERENCES users(id) ON DELETE SET NULL,
  child_email    TEXT        NOT NULL,
  policy_version TEXT        NOT NULL,
  consent_items  TEXT[]      NOT NULL,
  consented_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at   TIMESTAMPTZ,
  user_agent     TEXT
);

CREATE INDEX IF NOT EXISTS parent_consents_parent_id_idx    ON parent_consents(parent_id);
CREATE INDEX IF NOT EXISTS parent_consents_child_email_idx  ON parent_consents(child_email);

-- -----------------------------------------------------------------------------
-- RLS: mirrors the family-track tables — service role (supabaseAdmin) only.
-- Enable RLS with no permissive client policies; the admin client bypasses RLS.
-- No SELECT/INSERT policy is granted to anon/authenticated: all access goes
-- through app/api/parent/* routes. Minors' data — highest privacy bar.
-- -----------------------------------------------------------------------------
ALTER TABLE parent_consents ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Grants — service_role must be able to query/insert. authenticated is granted
-- to match the family-track pattern, but RLS (no policies) still blocks it; only
-- service_role (which bypasses RLS) can actually read/write these rows.
-- -----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON parent_consents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON parent_consents TO service_role;
