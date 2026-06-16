-- =============================================================================
-- Journeys/Classes split — Phase 2 (cleanup)
-- See docs/architecture/2026-06-16-journeys-classes-redesign.md for full rationale.
--
-- DO NOT RUN THIS until:
--   1. 20260616000000_classes_split_additive.sql has been run.
--   2. The application code has been updated to read/write classes,
--      class_mission_state, and the new class_id columns.
--   3. End-to-end manual verification has passed (rollout plan §7 step 5):
--      connect a fresh class, view missions/planets, lock→active→complete a
--      mission, enroll a student, confirm a second enrollment on the same
--      template is rejected.
--
-- This migration is destructive — it drops columns and renames a table.
-- The data backup from before this redesign lives in db-backups/2026-06-16/.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- MISSIONS — state moved to class_mission_state, no longer meaningful here.
-- -----------------------------------------------------------------------------
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_state_check;
ALTER TABLE missions DROP COLUMN IF EXISTS state;

-- -----------------------------------------------------------------------------
-- JOURNEYS — template-only now. These columns only ever made sense for the
-- old dual-purpose model.
-- -----------------------------------------------------------------------------
ALTER TABLE journeys DROP COLUMN IF EXISTS google_course_id;
ALTER TABLE journeys DROP COLUMN IF EXISTS teacher_id;
ALTER TABLE journeys DROP COLUMN IF EXISTS curriculum_journey_id;

-- -----------------------------------------------------------------------------
-- STUDENT_JOURNEYS — finish the rename to student_classes, drop journey_id
-- now that class_id + template_journey_id are populated by the app.
-- -----------------------------------------------------------------------------
ALTER TABLE student_journeys DROP COLUMN IF EXISTS journey_id;
ALTER TABLE student_journeys ALTER COLUMN class_id SET NOT NULL;
ALTER TABLE student_journeys ALTER COLUMN template_journey_id SET NOT NULL;
ALTER TABLE student_journeys RENAME TO student_classes;

-- -----------------------------------------------------------------------------
-- VOTES / VOTE_SESSIONS — drop journey_id now that class_id is populated.
-- -----------------------------------------------------------------------------
ALTER TABLE votes DROP COLUMN IF EXISTS journey_id;
ALTER TABLE votes ALTER COLUMN class_id SET NOT NULL;

ALTER TABLE vote_sessions DROP COLUMN IF EXISTS journey_id;
ALTER TABLE vote_sessions ALTER COLUMN class_id SET NOT NULL;

SELECT 'Phase 2 (cleanup) complete — missions.state, journeys legacy columns dropped; student_journeys renamed to student_classes; votes/vote_sessions repointed to class_id.' AS result;
