-- Migration: trial_leads
-- Captures free-trial signup requests from the public marketing landing page
-- (app/welcome). Inserts happen server-side only, via supabaseAdmin
-- (service-role key bypasses RLS) — RLS is enabled with no policies so the
-- anon/authenticated keys used by browser clients can neither read nor write.

CREATE TABLE IF NOT EXISTS trial_leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  school      text,
  role        text NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin', 'other')),
  class_size  text,
  message     text,
  source      text NOT NULL DEFAULT 'welcome_page',
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'dismissed')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trial_leads ENABLE ROW LEVEL SECURITY;

-- RLS bypass (service_role has rolbypassrls=true) only skips row-level policy
-- checks — it does not substitute for the base table-level GRANT Postgres
-- requires before any role can touch a table. See 20260702130000_grant_service_role_coin_tables.sql.
GRANT SELECT, INSERT ON trial_leads TO service_role;
