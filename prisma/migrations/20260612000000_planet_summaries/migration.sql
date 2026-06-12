-- CreateEnum
CREATE TYPE "PlanetSummaryStatus" AS ENUM ('not_started', 'in_progress', 'completed');

-- CreateTable
CREATE TABLE "planet_summaries" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "student_id" TEXT NOT NULL,
    "planet_id" TEXT NOT NULL,
    "status" "PlanetSummaryStatus" NOT NULL DEFAULT 'not_started',
    "performance_type" TEXT,
    "assessed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planet_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planet_summary_goals" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "summary_id" TEXT NOT NULL,
    "goal_title" TEXT NOT NULL,
    "performance_type" TEXT,
    "bot_question" TEXT NOT NULL,
    "student_answer" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planet_summary_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planet_summaries_student_id_idx" ON "planet_summaries"("student_id");

-- CreateIndex
CREATE INDEX "planet_summaries_planet_id_idx" ON "planet_summaries"("planet_id");

-- CreateIndex
CREATE UNIQUE INDEX "planet_summaries_student_id_planet_id_key" ON "planet_summaries"("student_id", "planet_id");

-- CreateIndex
CREATE INDEX "planet_summary_goals_summary_id_idx" ON "planet_summary_goals"("summary_id");

-- AddForeignKey
ALTER TABLE "planet_summaries" ADD CONSTRAINT "planet_summaries_planet_id_fkey" FOREIGN KEY ("planet_id") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planet_summary_goals" ADD CONSTRAINT "planet_summary_goals_summary_id_fkey" FOREIGN KEY ("summary_id") REFERENCES "planet_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
