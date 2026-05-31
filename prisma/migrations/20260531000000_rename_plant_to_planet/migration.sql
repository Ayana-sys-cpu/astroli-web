-- Rename plants → planets.
-- Phase 2 scaffold tables (plant_sources, generation_jobs) may not exist
-- in the live DB — all their steps are wrapped in IF EXISTS guards.

DO $$
BEGIN

  -- 1. Drop FKs on plants (unconditional — plants definitely exists if we got here)
  ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "plants_mission_id_fkey";
  ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "plants_created_by_fkey";
  ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "plants_generation_job_id_fkey";

  -- 2. Drop old index
  DROP INDEX IF EXISTS "plants_mission_id_idx";

  -- 3. Rename plants → planets and its primary key
  ALTER TABLE "plants" RENAME TO "planets";
  ALTER TABLE "planets" RENAME CONSTRAINT "plants_pkey" TO "planets_pkey";

  -- 4. Recreate index
  CREATE INDEX "planets_mission_id_idx" ON "planets"("mission_id");

  -- 5. Recreate FK → missions (always exists)
  ALTER TABLE "planets" ADD CONSTRAINT "planets_mission_id_fkey"
    FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

  -- 6. Recreate FK → users.
  --    The live Supabase users table uses user_id (UUID) as its PK, not id.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE "planets" ADD CONSTRAINT "planets_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  -- 7. Recreate FK → generation_jobs (Phase 2 scaffold — only if table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'generation_jobs'
  ) THEN
    ALTER TABLE "planets" ADD CONSTRAINT "planets_generation_job_id_fkey"
      FOREIGN KEY ("generation_job_id") REFERENCES "generation_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- 8. Rename plant_sources → planet_sources (Phase 2 scaffold — only if table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'plant_sources'
  ) THEN
    ALTER TABLE "plant_sources" DROP CONSTRAINT IF EXISTS "plant_sources_plant_id_fkey";
    ALTER TABLE "plant_sources" DROP CONSTRAINT IF EXISTS "plant_sources_material_id_fkey";
    ALTER TABLE "plant_sources" RENAME COLUMN "plant_id" TO "planet_id";
    ALTER TABLE "plant_sources" RENAME TO "planet_sources";
    ALTER TABLE "planet_sources" RENAME CONSTRAINT "plant_sources_pkey" TO "planet_sources_pkey";
    ALTER TABLE "planet_sources" ADD CONSTRAINT "planet_sources_planet_id_fkey"
      FOREIGN KEY ("planet_id") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "planet_sources" ADD CONSTRAINT "planet_sources_material_id_fkey"
      FOREIGN KEY ("material_id") REFERENCES "curriculum_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

END $$;
