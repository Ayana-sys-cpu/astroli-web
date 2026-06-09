-- CreateTable
CREATE TABLE "class_sessions" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "journey_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_signal_acknowledgements" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "teacher_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "journey_id" TEXT NOT NULL,
    "signal_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "teacher_signal_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_sessions_journey_id_idx" ON "class_sessions"("journey_id");

-- CreateIndex
CREATE INDEX "class_sessions_teacher_id_idx" ON "class_sessions"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_signal_ack" ON "teacher_signal_acknowledgements"("teacher_id", "student_id", "journey_id", "signal_type");

-- CreateIndex
CREATE INDEX "teacher_signal_acknowledgements_teacher_id_journey_id_idx" ON "teacher_signal_acknowledgements"("teacher_id", "journey_id");

-- CreateIndex
CREATE INDEX "teacher_signal_acknowledgements_teacher_id_student_id_signa_idx" ON "teacher_signal_acknowledgements"("teacher_id", "student_id", "signal_type");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
