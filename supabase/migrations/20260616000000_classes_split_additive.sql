-- =============================================================================
-- Journeys/Classes split — Phase 1 (additive)
-- See docs/architecture/2026-06-16-journeys-classes-redesign.md for full rationale.
--
-- IMPORTANT: the live DB does not match src/astroli-web/supabase/schema.sql.
-- The original tables (journeys, missions, planets, users, votes,
-- vote_sessions, student_journeys) were built with TEXT primary keys
-- (Prisma's convention), not native UUID — verified against the live
-- PostgREST OpenAPI spec, not the repo's schema.sql, which is stale/aspirational
-- here. Only the two newest tables (planet_characters, planet_teaching_goals)
-- use native UUID. Also: users' primary key column is `id`, not `user_id`.
-- This migration's FK types follow the VERIFIED live types below.
--
-- This migration ONLY ADDS structure. It does not drop or rename anything yet —
-- that happens in 20260616000001_classes_split_cleanup.sql, after the app code
-- is updated and manually verified end-to-end (see rollout plan §7 in the doc).
--
-- Run this entire file in Supabase SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CLASSES
-- A teacher's instance of exactly one curriculum journey (template).
-- journey_id is immutable after creation — enforced by application logic
-- (no UPDATE path exposed for it), not a DB trigger. See design doc §3.3.
--
-- id is native UUID (follows the newer-table convention set by
-- planet_characters/planet_teaching_goals). journey_id/teacher_id are TEXT
-- because journeys.id and users.id are TEXT in the live schema.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classes (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id        TEXT        NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  teacher_id        TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_course_id  TEXT        UNIQUE,
  title             TEXT        NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classes_journey_id_idx ON classes(journey_id);
CREATE INDEX IF NOT EXISTS classes_teacher_id_idx ON classes(teacher_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS classes_updated_at ON classes;
CREATE TRIGGER classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classes_select" ON classes;
CREATE POLICY "classes_select" ON classes FOR SELECT USING (true);


-- -----------------------------------------------------------------------------
-- CLASS_MISSION_STATE
-- Replaces the per-class "locked/voting/active/completed" tracking that used
-- to live on a duplicated missions row. mission_id is TEXT (missions.id is
-- TEXT in the live schema); class_id is UUID (matches the new classes.id).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_mission_state (
  class_id    UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  mission_id  TEXT        NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  state       TEXT        NOT NULL DEFAULT 'locked',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (class_id, mission_id),
  CONSTRAINT class_mission_state_check CHECK (
    state IN ('locked','voting','pending_start','active','completed','skipped')
  )
);

CREATE INDEX IF NOT EXISTS class_mission_state_class_id_idx ON class_mission_state(class_id);

DROP TRIGGER IF EXISTS class_mission_state_updated_at ON class_mission_state;
CREATE TRIGGER class_mission_state_updated_at
  BEFORE UPDATE ON class_mission_state
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE class_mission_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_mission_state_select" ON class_mission_state;
CREATE POLICY "class_mission_state_select" ON class_mission_state FOR SELECT USING (true);


-- -----------------------------------------------------------------------------
-- STUDENT_JOURNEYS — add the columns needed for the new enrollment constraint.
-- template_journey_id is TEXT (journeys.id is TEXT). class_id is UUID
-- (matches the new classes.id). Renaming to student_classes and dropping
-- journey_id happens in the cleanup migration.
-- -----------------------------------------------------------------------------
ALTER TABLE student_journeys ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE student_journeys ADD COLUMN IF NOT EXISTS template_journey_id TEXT REFERENCES journeys(id);

-- Partial unique index instead of a table-level UNIQUE constraint, since
-- template_journey_id is NULL for any pre-existing row until the app starts
-- populating it — a plain UNIQUE constraint would treat those NULLs as
-- non-distinct on some Postgres versions' edge cases; a partial index sidesteps it.
CREATE UNIQUE INDEX IF NOT EXISTS student_classes_one_per_template
  ON student_journeys (student_id, template_journey_id)
  WHERE template_journey_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- VOTES / VOTE_SESSIONS — add class_id alongside the existing journey_id.
-- App code switches to writing/reading class_id; journey_id is dropped in cleanup.
-- -----------------------------------------------------------------------------
ALTER TABLE votes ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE vote_sessions ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;


-- -----------------------------------------------------------------------------
-- Grants — mirroring the existing pattern (public select, service_role full
-- access) so these new tables don't repeat the missing-GRANT bug found
-- earlier this session on planet_teaching_goals and others.
-- -----------------------------------------------------------------------------
GRANT SELECT ON public.classes              TO anon, authenticated;
GRANT ALL    ON public.classes              TO service_role;
GRANT SELECT ON public.class_mission_state  TO anon, authenticated;
GRANT ALL    ON public.class_mission_state  TO service_role;

SELECT 'Phase 1 (additive) complete — classes, class_mission_state created; student_journeys/votes/vote_sessions extended with new FK columns.' AS result;
