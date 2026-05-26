-- ============================================================================
-- MIGRATION 003: Unify users tables + whitelist auth
--
-- What this does:
--   1. Creates authorized_teachers — founder-controlled teacher whitelist
--   2. Creates users — unified account table (replaces teachers + app_students)
--   3. Migrates existing rows, preserving UUIDs so dependent FK values are untouched
--   4. Re-points FK constraints on journeys/missions/plants/student_journeys/votes
--   5. Drops teachers and app_students
--
-- Run via: Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================================

BEGIN;

-- ── 1. authorized_teachers ────────────────────────────────────────────────────
-- Founder adds teacher emails here via the Supabase dashboard.
-- CHECK constraint enforces lowercase at the DB level — dashboard will reject
-- a mis-cased insert with a clear constraint error.
CREATE TABLE authorized_teachers (
  email     TEXT PRIMARY KEY CHECK (email = lower(email)),
  added_at  TIMESTAMPTZ DEFAULT now(),
  added_by  TEXT        DEFAULT 'founder',
  note      TEXT
);

-- ── 2. Unified users table ────────────────────────────────────────────────────
CREATE TABLE users (
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

-- set_updated_at() is already defined from the initial schema migration.
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select" ON users FOR SELECT USING (true);

-- ── 3a. Migrate teachers → users (preserving teacher_id as user_id) ───────────
-- Preserving the UUID means journeys.teacher_id, missions.created_by, and
-- plants.created_by already contain the correct user_id values — no data updates needed.
INSERT INTO users (
  user_id, email, role, full_name, first_name,
  google_id, gc_courses, auth_user_id, created_at
)
SELECT
  teacher_id,
  lower(email),
  'teacher',
  name,
  split_part(name, ' ', 1),
  google_id,
  gc_courses,
  auth_user_id,
  created_at
FROM teachers
ON CONFLICT (email) DO NOTHING;

-- ── PRE-FLIGHT CHECK (run this before the full migration, must return 0 rows) ─
-- If any rows are returned, those student_id values in student_journeys/votes
-- will be orphaned after the merge. Resolve them manually before proceeding.
--
-- SELECT s.student_id, s.email
-- FROM app_students s
-- JOIN teachers t ON lower(s.email) = lower(t.email);

-- ── 3b. Migrate app_students → users (preserving student_id as user_id) ───────
-- ON CONFLICT DO NOTHING: if an email appears in both tables (ghost record scenario),
-- the teacher row inserted above wins. The stale student row is discarded.
-- Preserving the UUID means student_journeys.student_id and votes.student_id
-- already contain the correct user_id values — no data updates needed.
INSERT INTO users (
  user_id, email, role, full_name, first_name,
  alien_name, base_avatar_url, avatar_url, area_of_interest,
  last_avatar_personalised_at, auth_user_id, created_at
)
SELECT
  student_id,
  lower(email),
  'student',
  full_name,
  first_name,
  alien_name,
  base_avatar_url,
  avatar_url,
  area_of_interest,
  last_avatar_personalised_at,
  auth_user_id,
  created_at
FROM app_students
ON CONFLICT (email) DO NOTHING;

-- ── 4. Re-point FK constraints from old tables → users ────────────────────────
ALTER TABLE journeys
  DROP CONSTRAINT IF EXISTS journeys_teacher_id_fkey,
  ADD CONSTRAINT journeys_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE missions
  DROP CONSTRAINT IF EXISTS missions_created_by_fkey,
  ADD CONSTRAINT missions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(user_id);

ALTER TABLE plants
  DROP CONSTRAINT IF EXISTS plants_created_by_fkey,
  ADD CONSTRAINT plants_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(user_id);

ALTER TABLE student_journeys
  DROP CONSTRAINT IF EXISTS student_journeys_student_id_fkey,
  ADD CONSTRAINT student_journeys_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE votes
  DROP CONSTRAINT IF EXISTS votes_student_id_fkey,
  ADD CONSTRAINT votes_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- ── 5. Drop old tables ─────────────────────────────────────────────────────────
-- FK constraints from all dependent tables were replaced above.
-- CASCADE removes any remaining DB-side dependencies (triggers, policies).
DROP TABLE teachers     CASCADE;
DROP TABLE app_students CASCADE;

COMMIT;
