-- Migration: founder_feedback
-- Founder-only log of out-of-band pilot feedback (WhatsApp / email / in
-- person). The founder documents what she hears, tags it to a student when
-- relevant, and tracks processing status. student_id is nullable on purpose:
-- feedback may concern a parent or the platform in general.
--
-- All access goes through /api/admin/feedback* routes (requireAdmin +
-- supabaseAdmin) — RLS is enabled with no policies so browser/anon keys can
-- neither read nor write.

CREATE TABLE IF NOT EXISTS founder_feedback (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   text        REFERENCES users(id) ON DELETE SET NULL,
  source       text        NOT NULL DEFAULT 'other' CHECK (source IN ('whatsapp', 'email', 'in_person', 'other')),
  content      text        NOT NULL,
  status       text        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'actioned')),
  tags         text[]      NOT NULL DEFAULT '{}',
  action_notes text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS founder_feedback_student_id_idx ON founder_feedback (student_id);
CREATE INDEX IF NOT EXISTS founder_feedback_status_idx     ON founder_feedback (status);

ALTER TABLE founder_feedback ENABLE ROW LEVEL SECURITY;

-- RLS bypass (service_role has rolbypassrls=true) only skips row-level policy
-- checks — it does not substitute for the base table-level GRANT Postgres
-- requires before any role can touch a table. See 20260702130000_grant_service_role_coin_tables.sql.
GRANT SELECT, INSERT, UPDATE, DELETE ON founder_feedback TO service_role;
