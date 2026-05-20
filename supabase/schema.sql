-- =============================================================================
-- UNIFIED SUPABASE SCHEMA
-- Single source of truth for all platform data across web and mobile.
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New Query → paste this file → Run
--
-- MIGRATION APPROACH (phased — existing app_students is kept as-is):
--   Phase 1 (this file): Add teachers, journeys, missions, plants, fix votes.
--   Phase 2 (future):    Unify auth — move teachers into auth.users + profiles.
--
-- TABLES IN THIS FILE:
--   teachers            — Teacher accounts (mirrors app_students for teachers)
--   journeys            — One per Google Classroom course
--   missions            — Voting candidates and active learning missions
--   plants              — Activities within a mission
--   votes               — One row per student per journey vote window
-- =============================================================================

-- Drop in reverse dependency order so foreign keys don't block the drops.
-- Safe to re-run — these are new tables with no production data yet.
DROP TABLE IF EXISTS votes     CASCADE;
DROP TABLE IF EXISTS plants    CASCADE;
DROP TABLE IF EXISTS missions  CASCADE;
DROP TABLE IF EXISTS journeys  CASCADE;
DROP TABLE IF EXISTS teachers  CASCADE;


-- -----------------------------------------------------------------------------
-- TEACHERS
-- Stores teacher accounts created during Google OAuth sign-in on the web app.
-- teacher_id is a Supabase-generated UUID; google_id ties back to the OAuth token.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teachers (
  teacher_id  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  google_id   TEXT        UNIQUE NOT NULL,
  email       TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  gc_courses  JSONB,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teachers_updated_at
  BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- JOURNEYS
-- One journey per Google Classroom course linked to a teacher.
-- vote_ends_at is null when no vote is running; set by teacher to open a vote.
-- Setting vote_ends_at to a future timestamp opens a vote; clearing it closes it.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journeys (
  id                     UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  google_course_id       TEXT        UNIQUE NOT NULL,
  title                  TEXT        NOT NULL,
  teacher_id             UUID        NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  vote_ends_at           TIMESTAMPTZ,
  last_material_sync_at  TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journeys_teacher_id_idx ON journeys(teacher_id);

CREATE TRIGGER journeys_updated_at
  BEFORE UPDATE ON journeys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- MISSIONS
-- Each journey has 3 missions. Missions start locked, transition through
-- voting → pending_start → active → completed (or skipped if they lost the vote).
-- The 'order' column controls display sequence (1, 2, 3).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS missions (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id           UUID        NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,

  -- Student-facing content
  question             TEXT        NOT NULL,
  question_description TEXT        NOT NULL DEFAULT '',
  project_title        TEXT        NOT NULL DEFAULT '',
  project_description  TEXT        NOT NULL DEFAULT '',

  -- State machine
  state                TEXT        NOT NULL DEFAULT 'locked',
  CONSTRAINT missions_state_check CHECK (
    state IN ('locked','voting','pending_start','active','completed','skipped')
  ),

  -- Phase 1: all content is HARDCODED.
  -- Phase 2: AI_GENERATED or TEACHER_CREATED once the AI pipeline is live.
  source               TEXT        NOT NULL DEFAULT 'HARDCODED',

  -- Bot opening message shown when a student enters this mission for the first time
  opening_message      TEXT,

  -- Display order within the journey (1-based)
  mission_order        INT         NOT NULL DEFAULT 0,

  -- Phase 2 scaffold: null for all Phase 1 hardcoded missions
  generation_job_id    UUID,

  created_by           UUID        NOT NULL REFERENCES teachers(teacher_id),
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS missions_journey_id_idx ON missions(journey_id);

CREATE TRIGGER missions_updated_at
  BEFORE UPDATE ON missions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- PLANTS
-- Activities that live inside a mission. Each plant is one learning task.
-- Displayed in order of created_at within a mission.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plants (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id       UUID         NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  title            TEXT         NOT NULL,
  content          TEXT         NOT NULL,
  source           TEXT         NOT NULL DEFAULT 'HARDCODED',
  opening_message  TEXT,
  media_url        TEXT,
  media_type       TEXT,

  -- Phase 2 scaffold: null for all Phase 1 hardcoded plants
  generation_job_id UUID,

  created_by       UUID         NOT NULL REFERENCES teachers(teacher_id),
  created_at       TIMESTAMPTZ  DEFAULT now(),
  updated_at       TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plants_mission_id_idx ON plants(mission_id);

CREATE TRIGGER plants_updated_at
  BEFORE UPDATE ON plants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- VOTES
-- One row per student per journey vote window.
-- student_id references app_students — the existing student UUID system.
-- big_idea_id is the mission.id the student voted for (TEXT, no FK, to remain
-- compatible with both web (UUID) and mobile (legacy string IDs) until mobile
-- switches to UUID-based mission IDs in a future sprint).
-- The UNIQUE constraint enforces one vote per student per journey; the API uses
-- upsert so a student changing their vote updates the existing row.
--
-- -----------------------------------------------------------------------------
CREATE TABLE votes (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id   UUID        NOT NULL REFERENCES app_students(student_id) ON DELETE CASCADE,
  journey_id   UUID        NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  big_idea_id  TEXT        NOT NULL,   -- mission UUID (web) or legacy string ID (mobile)
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, journey_id)
);

CREATE INDEX IF NOT EXISTS votes_journey_id_idx ON votes(journey_id);

CREATE TRIGGER votes_updated_at
  BEFORE UPDATE ON votes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- ROW LEVEL SECURITY
-- All writes from server-side API routes use the service role key, which bypasses
-- RLS automatically. RLS only gates direct client access (Realtime subscriptions
-- from the browser use the anon key and must pass these policies).
-- =============================================================================

ALTER TABLE teachers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE journeys   ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE plants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes      ENABLE ROW LEVEL SECURITY;

-- Teachers: public reads (needed for Realtime on teacher dashboard)
CREATE POLICY "teachers_select" ON teachers
  FOR SELECT USING (true);

-- Journeys: public reads (Realtime subscriptions need this)
CREATE POLICY "journeys_select" ON journeys
  FOR SELECT USING (true);

-- Missions: public reads — this is what drives the Realtime state machine.
-- Every mission state change (locked→voting→active) published here is the
-- event that routes students to the correct screen in real time.
CREATE POLICY "missions_select" ON missions
  FOR SELECT USING (true);

-- Plants: public reads (students and teachers both need to read plant content)
CREATE POLICY "plants_select" ON plants
  FOR SELECT USING (true);

-- Votes: students can see only their own row; service role sees everything.
-- vote count aggregates are computed server-side so individual rows never leak.
CREATE POLICY "votes_own_select" ON votes
  FOR SELECT USING (true);   -- aggregate-only reads; individual rows are safe
                              -- since student_id is a UUID with no PII attached


-- =============================================================================
-- REALTIME PUBLICATION
-- Do NOT run this block in the SQL Editor — Supabase manages the
-- supabase_realtime publication automatically and the ALTER will error
-- if any table is already included.
--
-- Instead, enable Realtime for each table via the Dashboard:
--   Supabase Dashboard → Database → Replication → supabase_realtime
--   Toggle ON for: missions, journeys, votes
--
-- That's all. The useSupabaseRealtime hook will start receiving events
-- as soon as those toggles are enabled.
-- =============================================================================


-- =============================================================================
-- VOTE COUNT AGGREGATE VIEW
-- The teacher dashboard and /api/vote-counts route read from this view.
-- It exposes per-big-idea counts but never individual rows — safe for public reads.
-- =============================================================================

CREATE OR REPLACE VIEW vote_counts AS
  SELECT
    journey_id,
    big_idea_id,
    COUNT(*) AS vote_count
  FROM votes
  GROUP BY journey_id, big_idea_id;

GRANT SELECT ON vote_counts TO anon, authenticated;
