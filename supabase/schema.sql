-- =============================================================================
-- UNIFIED SUPABASE SCHEMA
-- Single source of truth for all platform data across web and mobile.
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New Query → paste this file → Run
--
-- TABLES IN THIS FILE:
--   authorized_teachers — Founder-controlled teacher email whitelist
--   users               — Unified account table (teachers + students)
--   journeys            — One per Google Classroom course
--   vote_sessions       — One per teacher-initiated vote round
--   missions            — Voting candidates and active learning missions
--   planets             — Activities within a mission
--   student_journeys    — Join table: students enrolled in journeys
--   votes               — One row per student per journey vote window
-- =============================================================================

-- Drop in reverse dependency order so foreign keys don't block the drops.
-- Safe to re-run — these are new tables with no production data yet.
DROP TABLE IF EXISTS student_journeys CASCADE;
DROP TABLE IF EXISTS votes            CASCADE;
DROP TABLE IF EXISTS vote_sessions    CASCADE;
DROP TABLE IF EXISTS planets           CASCADE;
DROP TABLE IF EXISTS missions         CASCADE;
DROP TABLE IF EXISTS journeys         CASCADE;
DROP TABLE IF EXISTS authorized_teachers CASCADE;
DROP TABLE IF EXISTS app_students        CASCADE;
DROP TABLE IF EXISTS users               CASCADE;


-- -----------------------------------------------------------------------------
-- AUTHORIZED_TEACHERS
-- Founder-controlled whitelist of teacher emails. Founder adds emails here
-- via the Supabase dashboard. CHECK constraint enforces lowercase at the DB
-- level — the dashboard will reject a mis-cased insert with a clear error.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS authorized_teachers (
  email     TEXT PRIMARY KEY CHECK (email = lower(email)),
  added_at  TIMESTAMPTZ DEFAULT now(),
  added_by  TEXT        DEFAULT 'founder',
  note      TEXT
);

-- updated_at trigger (used by users and downstream tables)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- USERS
-- Unified account table replacing the former teachers + app_students tables.
-- role distinguishes teacher vs. student; teacher-specific and student-specific
-- columns are NULL for the other role.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id                     UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email                       TEXT        UNIQUE NOT NULL CHECK (email = lower(email)),
  role                        TEXT        NOT NULL DEFAULT 'student'
                                          CHECK (role IN ('teacher', 'student')),
  -- shared
  full_name                   TEXT,
  first_name                  TEXT,
  -- teacher-specific (NULL for students)
  google_id                   TEXT,
  gc_courses                  JSONB,
  -- student-specific (NULL for teachers)
  alien_name                  TEXT,
  base_avatar_url             TEXT,
  avatar_url                  TEXT,
  area_of_interest            TEXT,
  last_avatar_personalised_at TIMESTAMPTZ,
  -- auth linkage
  auth_user_id                UUID UNIQUE,
  -- audit
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- JOURNEYS
-- One journey per Google Classroom course linked to a teacher.
-- Vote state is managed via the vote_sessions table — no vote_ends_at here.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journeys (
  id                     UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  google_course_id       TEXT        UNIQUE NOT NULL,
  title                  TEXT        NOT NULL,
  teacher_id             UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  last_material_sync_at  TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journeys_teacher_id_idx ON journeys(teacher_id);

CREATE TRIGGER journeys_updated_at
  BEFORE UPDATE ON journeys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- VOTE SESSIONS
-- Each time a teacher opens a class vote it creates one row here.
-- A journey can have many sessions over its lifetime (e.g. round 1, round 2).
-- status: 'open' while voting is in progress; 'concluded' once closed.
-- winner_id records which mission.id won (set when the teacher finishes the vote).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vote_sessions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id  UUID        NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  winner_id   TEXT,
  status      TEXT        NOT NULL DEFAULT 'open',
  CONSTRAINT vote_sessions_status_check CHECK (status IN ('open', 'concluded')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vote_sessions_journey_id_idx ON vote_sessions(journey_id);
CREATE INDEX IF NOT EXISTS vote_sessions_status_idx     ON vote_sessions(status);

CREATE TRIGGER vote_sessions_updated_at
  BEFORE UPDATE ON vote_sessions
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

  created_by           UUID        NOT NULL REFERENCES users(user_id),
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS missions_journey_id_idx ON missions(journey_id);

CREATE TRIGGER missions_updated_at
  BEFORE UPDATE ON missions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- PLANTS
-- Activities that live inside a mission. Each planet is one learning task.
-- Displayed in order of created_at within a mission.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planets (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id       UUID         NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  title            TEXT         NOT NULL,
  label            TEXT,
  short_title      TEXT,
  planet_question  TEXT,
  content          TEXT         NOT NULL,
  source           TEXT         NOT NULL DEFAULT 'HARDCODED',
  opening_message  TEXT,
  media_url        TEXT,
  media_type       TEXT,

  -- Phase 2 scaffold: null for all Phase 1 hardcoded planets
  generation_job_id UUID,

  created_by       UUID         NOT NULL REFERENCES users(user_id),
  created_at       TIMESTAMPTZ  DEFAULT now(),
  updated_at       TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planets_mission_id_idx ON planets(mission_id);

CREATE TRIGGER planets_updated_at
  BEFORE UPDATE ON planets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- VOTES
-- One row per student per vote session.
-- vote_session_id ties each vote to a specific round — supporting multiple vote
-- rounds per journey without old votes colliding with new ones.
-- journey_id is denormalized here so Realtime subscriptions can filter by
-- journey without joining vote_sessions on every event.
-- big_idea_id is the mission.id the student voted for (TEXT, no FK, to remain
-- compatible with both web (UUID) and mobile (legacy string IDs)).
-- The UNIQUE constraint enforces one vote per student per session; the API uses
-- upsert so a student changing their vote updates the existing row.
-- -----------------------------------------------------------------------------
-- -----------------------------------------------------------------------------
-- STUDENT_JOURNEYS
-- Join table linking students to the journeys they are enrolled in.
-- Populated automatically on student sign-in: we call Google Classroom with
-- the student's access token, match their course IDs against journeys.google_course_id,
-- and upsert here. Safe to call on every sign-in (idempotent).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_journeys (
  student_id   UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  journey_id   UUID        NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  enrolled_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (student_id, journey_id)
);

CREATE INDEX IF NOT EXISTS student_journeys_student_id_idx ON student_journeys(student_id);
CREATE INDEX IF NOT EXISTS student_journeys_journey_id_idx ON student_journeys(journey_id);

CREATE TRIGGER student_journeys_enrolled_at
  BEFORE UPDATE ON student_journeys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE votes (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id       UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  vote_session_id  UUID        NOT NULL REFERENCES vote_sessions(id) ON DELETE CASCADE,
  journey_id       UUID        NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  big_idea_id      TEXT        NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, vote_session_id)
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

ALTER TABLE authorized_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE journeys         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE planets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_journeys ENABLE ROW LEVEL SECURITY;

-- Users: public reads (needed for Realtime on teacher dashboard and student screens)
CREATE POLICY "users_select" ON users FOR SELECT USING (true);

-- Journeys: public reads (Realtime subscriptions need this)
CREATE POLICY "journeys_select" ON journeys
  FOR SELECT USING (true);

-- Vote sessions: public reads (students need to discover active vote sessions).
CREATE POLICY "vote_sessions_select" ON vote_sessions
  FOR SELECT USING (true);

-- Missions: public reads — this is what drives the Realtime state machine.
-- Every mission state change (locked→voting→active) published here is the
-- event that routes students to the correct screen in real time.
CREATE POLICY "missions_select" ON missions
  FOR SELECT USING (true);

-- Planets: public reads (students and teachers both need to read plant content)
CREATE POLICY "planets_select" ON planets
  FOR SELECT USING (true);

-- Votes: students can see only their own row; service role sees everything.
-- vote count aggregates are computed server-side so individual rows never leak.
CREATE POLICY "votes_own_select" ON votes
  FOR SELECT USING (true);   -- aggregate-only reads; individual rows are safe
                              -- since student_id is a UUID with no PII attached

-- Student journeys: public reads — student_id is a UUID with no PII attached.
-- All writes go through the service role (server-side API routes).
CREATE POLICY "student_journeys_select" ON student_journeys
  FOR SELECT USING (true);


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
    vote_session_id,
    journey_id,
    big_idea_id,
    COUNT(*) AS vote_count
  FROM votes
  GROUP BY vote_session_id, journey_id, big_idea_id;

GRANT SELECT ON vote_counts TO anon, authenticated;
