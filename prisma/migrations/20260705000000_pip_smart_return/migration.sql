-- Migration: pip_smart_return
-- Creates student_mission_state and pip_messages tables with RLS policies.
-- Note: public.users.id and public.missions.id are text (not uuid), so FK columns use text.

-- ── student_mission_state ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "student_mission_state" (
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "student_id"           text NOT NULL,
  "mission_id"           text NOT NULL,
  "confirmed_at"         timestamptz,
  "last_map_visit_at"    timestamptz,
  "last_visit_snapshot"  jsonb NOT NULL DEFAULT '{"planets": {}}'::jsonb,
  "created_at"           timestamptz NOT NULL DEFAULT now(),
  "updated_at"           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "student_mission_state_student_mission_key" UNIQUE ("student_id", "mission_id"),
  CONSTRAINT "student_mission_state_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "student_mission_state_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "student_mission_state_student_id_idx" ON "student_mission_state"("student_id");
CREATE INDEX IF NOT EXISTS "student_mission_state_mission_id_idx" ON "student_mission_state"("mission_id");

ALTER TABLE "student_mission_state" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_mission_state_own_rows" ON "student_mission_state"
  USING ("student_id"::uuid = auth.uid())
  WITH CHECK ("student_id"::uuid = auth.uid());

-- ── pip_messages ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "pip_messages" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "student_id"   text NOT NULL,
  "mission_id"   text NOT NULL,
  "role"         text NOT NULL,
  "content"      text NOT NULL,
  "trigger_type" text NOT NULL,
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pip_messages_role_check" CHECK ("role" IN ('pip', 'student')),
  CONSTRAINT "pip_messages_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "pip_messages_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "pip_messages_student_mission_idx" ON "pip_messages"("student_id", "mission_id");
CREATE INDEX IF NOT EXISTS "pip_messages_created_at_idx"      ON "pip_messages"("created_at");

ALTER TABLE "pip_messages" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pip_messages_own_rows" ON "pip_messages"
  USING ("student_id"::uuid = auth.uid())
  WITH CHECK ("student_id"::uuid = auth.uid());
