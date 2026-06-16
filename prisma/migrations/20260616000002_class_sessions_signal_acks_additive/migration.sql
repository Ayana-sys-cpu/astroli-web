-- =============================================================================
-- Journeys/Classes split — Phase 1b (additive)
-- Covers two tables discovered after Phase 1 was already applied: class_sessions
-- and teacher_signal_acknowledgements. Both use journey_id to mean "the class
-- a teacher is monitoring" — same treatment as votes/vote_sessions in Phase 1.
-- See docs/architecture/2026-06-16-journeys-classes-redesign.md.
--
-- Additive only — journey_id stays until the cleanup migration, after app
-- code is updated and verified.
--
-- Run this entire file in Supabase SQL Editor.
-- =============================================================================

ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE teacher_signal_acknowledgements ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;

SELECT 'Phase 1b (additive) complete — class_sessions and teacher_signal_acknowledgements extended with class_id.' AS result;
