-- Migration: student_activity_sessions
-- One row per continuous activity session, for the founder's pilot-review
-- dashboard (are students coming back? how long do they stay?). The client
-- pings POST /api/activity/ping every few minutes; pings gapped under 30
-- minutes are stitched into the same row at write time, so duration =
-- last_ping_at - started_at.
--
-- COPPA-minimal by design: who / when / platform only — no IP, no user-agent,
-- no device identifiers. Keep it that way.
--
-- source='backfill' rows are approximate sessions derived from historical
-- bot-message timestamps (scripts/backfill-activity-sessions.sql); they carry
-- platform='bot' and are labeled "approx" in the admin UI.
--
-- Writes happen server-side only via supabaseAdmin — RLS is enabled with no
-- policies so browser/anon keys can neither read nor write.

CREATE TABLE IF NOT EXISTS student_activity_sessions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   text        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform     text        NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'mobile', 'bot')),
  started_at   timestamptz NOT NULL DEFAULT now(),
  last_ping_at timestamptz NOT NULL DEFAULT now(),
  ping_count   integer     NOT NULL DEFAULT 1,
  source       text        NOT NULL DEFAULT 'ping' CHECK (source IN ('ping', 'backfill'))
);

-- The ping endpoint reads "most recent session for this student" on every
-- ping; the admin dashboard reads recent sessions per student.
CREATE INDEX IF NOT EXISTS student_activity_sessions_student_recent_idx
  ON student_activity_sessions (student_id, last_ping_at DESC);

ALTER TABLE student_activity_sessions ENABLE ROW LEVEL SECURITY;

-- RLS bypass (service_role has rolbypassrls=true) only skips row-level policy
-- checks — it does not substitute for the base table-level GRANT Postgres
-- requires before any role can touch a table. See 20260702130000_grant_service_role_coin_tables.sql.
GRANT SELECT, INSERT, UPDATE, DELETE ON student_activity_sessions TO service_role;
