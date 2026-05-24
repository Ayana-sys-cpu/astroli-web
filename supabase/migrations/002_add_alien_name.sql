-- Adds the alien_name column to app_students.
-- Run in Supabase Dashboard → SQL Editor → New Query → paste → Run.
--
-- alien_name: the bot companion name generated at onboarding (e.g. "Xylo-Vex").
-- Stored here so it's always read from the database, not recomputed, giving
-- every screen the same consistent name regardless of localStorage state.

ALTER TABLE app_students ADD COLUMN IF NOT EXISTS alien_name TEXT;
