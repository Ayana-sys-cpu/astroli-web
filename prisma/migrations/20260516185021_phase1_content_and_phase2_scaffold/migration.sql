/*
  Warnings:

  - Added the required column `project_description` to the `missions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_title` to the `missions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `question_description` to the `missions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ContentSource" AS ENUM ('HARDCODED', 'AI_GENERATED', 'TEACHER_CREATED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('ASSIGNMENT', 'MATERIAL', 'ANNOUNCEMENT', 'DRIVE_FILE', 'YOUTUBE', 'LINK', 'OTHER');

-- AlterTable
ALTER TABLE "journeys" ADD COLUMN     "last_material_sync_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "generation_job_id" TEXT,
ADD COLUMN     "project_description" TEXT NOT NULL,
ADD COLUMN     "project_title" TEXT NOT NULL,
ADD COLUMN     "question_description" TEXT NOT NULL,
ADD COLUMN     "source" "ContentSource" NOT NULL DEFAULT 'HARDCODED';

-- AlterTable
ALTER TABLE "plants" ADD COLUMN     "generation_job_id" TEXT,
ADD COLUMN     "media_type" "MaterialType",
ADD COLUMN     "media_url" TEXT,
ADD COLUMN     "source" "ContentSource" NOT NULL DEFAULT 'HARDCODED';

-- CreateTable
CREATE TABLE "curriculum_materials" (
    "id" TEXT NOT NULL,
    "journey_id" TEXT NOT NULL,
    "google_material_id" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "extracted_content" TEXT,
    "synced_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plant_sources" (
    "plant_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,

    CONSTRAINT "plant_sources_pkey" PRIMARY KEY ("plant_id","material_id")
);

-- CreateTable
CREATE TABLE "generation_jobs" (
    "id" TEXT NOT NULL,
    "journey_id" TEXT NOT NULL,
    "triggered_by" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "model" TEXT,
    "error_message" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "curriculum_materials_journey_id_idx" ON "curriculum_materials"("journey_id");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_materials_journey_id_google_material_id_key" ON "curriculum_materials"("journey_id", "google_material_id");

-- CreateIndex
CREATE INDEX "generation_jobs_journey_id_idx" ON "generation_jobs"("journey_id");

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_generation_job_id_fkey" FOREIGN KEY ("generation_job_id") REFERENCES "generation_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_generation_job_id_fkey" FOREIGN KEY ("generation_job_id") REFERENCES "generation_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_materials" ADD CONSTRAINT "curriculum_materials_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plant_sources" ADD CONSTRAINT "plant_sources_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plant_sources" ADD CONSTRAINT "plant_sources_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "curriculum_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
