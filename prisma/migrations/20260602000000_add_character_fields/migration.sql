-- Add character identity fields to planets table.
-- These replace the hardcoded values in planet-experience.ts.

ALTER TABLE "planets" ADD COLUMN IF NOT EXISTS "character_figure"   TEXT;
ALTER TABLE "planets" ADD COLUMN IF NOT EXISTS "character_year"     TEXT;
ALTER TABLE "planets" ADD COLUMN IF NOT EXISTS "character_location" TEXT;
ALTER TABLE "planets" ADD COLUMN IF NOT EXISTS "student_reveal_message" TEXT;
