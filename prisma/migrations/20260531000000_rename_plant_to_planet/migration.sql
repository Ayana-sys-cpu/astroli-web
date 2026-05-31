-- Rename plants → planets and plant_sources → planet_sources.
-- Drop old FK constraints before renaming, then re-add with correct names.

-- 1. Drop FKs that reference "plants" by name
ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "plants_mission_id_fkey";
ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "plants_created_by_fkey";
ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "plants_generation_job_id_fkey";
ALTER TABLE "plant_sources" DROP CONSTRAINT IF EXISTS "plant_sources_plant_id_fkey";
ALTER TABLE "plant_sources" DROP CONSTRAINT IF EXISTS "plant_sources_material_id_fkey";

-- 2. Drop old indexes
DROP INDEX IF EXISTS "plants_mission_id_idx";

-- 3. Rename column plant_id → planet_id in plant_sources
ALTER TABLE "plant_sources" RENAME COLUMN "plant_id" TO "planet_id";

-- 4. Rename tables
ALTER TABLE "plants" RENAME TO "planets";
ALTER TABLE "plant_sources" RENAME TO "planet_sources";

-- 5. Rename primary key constraint on planets
ALTER TABLE "planets" RENAME CONSTRAINT "plants_pkey" TO "planets_pkey";

-- 6. Rename primary key constraint on planet_sources
ALTER TABLE "planet_sources" RENAME CONSTRAINT "plant_sources_pkey" TO "planet_sources_pkey";

-- 7. Recreate index
CREATE INDEX "planets_mission_id_idx" ON "planets"("mission_id");

-- 8. Recreate FK constraints with correct names
ALTER TABLE "planets" ADD CONSTRAINT "planets_mission_id_fkey"
  FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "planets" ADD CONSTRAINT "planets_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "planets" ADD CONSTRAINT "planets_generation_job_id_fkey"
  FOREIGN KEY ("generation_job_id") REFERENCES "generation_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "planet_sources" ADD CONSTRAINT "planet_sources_planet_id_fkey"
  FOREIGN KEY ("planet_id") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "planet_sources" ADD CONSTRAINT "planet_sources_material_id_fkey"
  FOREIGN KEY ("material_id") REFERENCES "curriculum_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
