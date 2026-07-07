-- =============================================================================
-- Family Track — B2C parent-child route
-- Spec: specs/parent/web-app/family-track/spec.md
-- Data model: specs/parent/web-app/family-track/data-model.md
--
-- All changes are ADDITIVE. Nothing is dropped or renamed.
-- Apply in Supabase SQL Editor or via supabase db push.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- authorized_parents
-- Founder-managed allowlist. Mirrors authorized_teachers exactly.
-- Presence of an email here grants the parent account full access past the
-- waitlist wall.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS authorized_parents (
  email       TEXT        PRIMARY KEY,
  granted_by  TEXT        NOT NULL DEFAULT 'founder',
  granted_at  TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- parent_waitlist
-- Captures parent sign-up attempts not yet on the allowlist.
-- email UNIQUE prevents duplicate submissions.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parent_waitlist (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        UNIQUE NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- parent_child_link
-- Ownership join between a parent users row and a child users row.
-- v1: role is always 'owner'. Co-parent ('co-parent') is future scope.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parent_child_link (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'owner' CHECK (role IN ('owner')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (parent_id, child_id)
);

CREATE INDEX IF NOT EXISTS parent_child_link_parent_id_idx ON parent_child_link(parent_id);
CREATE INDEX IF NOT EXISTS parent_child_link_child_id_idx  ON parent_child_link(child_id);

-- -----------------------------------------------------------------------------
-- child_invites
-- One-time invite tokens sent to a child's Gmail.
-- Expires 48 hours after creation. accepted_at IS NULL = pending.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS child_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_email TEXT        NOT NULL,
  token       UUID        UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + interval '48 hours',
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS child_invites_token_idx       ON child_invites(token);
CREATE INDEX IF NOT EXISTS child_invites_child_email_idx ON child_invites(child_email);

-- -----------------------------------------------------------------------------
-- users — extend role CHECK to include 'parent'
-- -----------------------------------------------------------------------------
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('teacher', 'student', 'parent'));

-- -----------------------------------------------------------------------------
-- users — new columns for family track
-- All default to safe values; existing rows unaffected.
-- -----------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bot_conversations_used  INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bot_conversations_limit INT         NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS bot_cap_reset_at        TIMESTAMPTZ DEFAULT (date_trunc('month', now()) + interval '1 month'),
  ADD COLUMN IF NOT EXISTS plan                    TEXT        NOT NULL DEFAULT 'free';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('free', 'paid'));

-- -----------------------------------------------------------------------------
-- classes — discriminator column for school vs family classes
-- Default 'school' keeps all existing rows unchanged.
-- -----------------------------------------------------------------------------
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'school';

ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_type_check;
ALTER TABLE classes ADD CONSTRAINT classes_type_check
  CHECK (type IN ('school', 'family'));

CREATE INDEX IF NOT EXISTS classes_type_idx ON classes(type);

-- -----------------------------------------------------------------------------
-- RLS: all new tables use supabaseAdmin (service role) from API routes.
-- Enable RLS with no permissive client policies — admin client bypasses RLS.
-- -----------------------------------------------------------------------------
ALTER TABLE authorized_parents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_waitlist     ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child_link   ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_invites       ENABLE ROW LEVEL SECURITY;
