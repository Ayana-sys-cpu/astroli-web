-- CreateTable: votes
-- One row per student per journey. journeyId and studentId are plain strings
-- (mobile app keys / Supabase Auth UUIDs) with no FK constraints to other tables.
-- The unique index on (student_id, journey_id) enforces one vote per student per journey.

CREATE TABLE "votes" (
    "id"          TEXT        NOT NULL,
    "student_id"  TEXT        NOT NULL,
    "journey_id"  TEXT        NOT NULL,
    "big_idea_id" TEXT        NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "votes_student_id_journey_id_key" ON "votes"("student_id", "journey_id");
CREATE INDEX "votes_journey_id_idx" ON "votes"("journey_id");
