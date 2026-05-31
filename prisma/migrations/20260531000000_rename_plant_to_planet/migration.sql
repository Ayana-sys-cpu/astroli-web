-- Rename plants → planets (and plant_sources → planet_sources if it exists).
-- plant_sources is a Phase 2 scaffold — it may not exist in the live DB yet.

-- 1. Drop FKs on plants
ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "plants_mission_id_fkey";
ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "plants_created_by_fkey";
ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "plants_generation_job_id_fkey";

-- 2. Drop old index
DROP INDEX IF EXISTS "plants_mission_id_idx";

-- 3. Rename plants table and its primary key
ALTER TABLE "plants" RENAME TO "planets";
ALTER TABLE "planets" RENAME CONSTRAINT "plants_pkey" TO "planets_pkey";

-- 4. Recreate index and FKs on planets
CREATE INDEX "planets_mission_id_idx" ON "planets"("mission_id");

ALTER TABLE "planets" ADD CONSTRAINT "planets_mission_id_fkey"
  FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "planets" ADD CONSTRAINT "planets_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "planets" ADD CONSTRAINT "planets_generation_job_id_fkey"
  FOREIGN KEY ("generation_job_id") REFERENCES "generation_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Rename plant_sources → planet_sources (only if the table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plant_sources') THEN
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
