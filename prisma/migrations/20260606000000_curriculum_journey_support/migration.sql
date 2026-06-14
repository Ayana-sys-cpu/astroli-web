-- Allow journeys to exist as curriculum templates (no class attached)
ALTER TABLE "journeys" ALTER COLUMN "google_course_id" DROP NOT NULL;
ALTER TABLE "journeys" ALTER COLUMN "teacher_id" DROP NOT NULL;

-- Track which curriculum template a class journey was built from
ALTER TABLE "journeys" ADD COLUMN "curriculum_journey_id" TEXT;
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_curriculum_journey_id_fkey"
  FOREIGN KEY ("curriculum_journey_id") REFERENCES "journeys"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
