-- student_journeys and mission_started_by_student were never created via
-- Prisma migrations. Added here so any fresh DB setup includes them.

CREATE TABLE IF NOT EXISTS student_journeys (
  id          TEXT        DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  student_id  TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  journey_id  TEXT        NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT student_journeys_student_journey_unique UNIQUE (student_id, journey_id)
);
CREATE INDEX IF NOT EXISTS student_journeys_student_id_idx ON student_journeys(student_id);
CREATE INDEX IF NOT EXISTS student_journeys_journey_id_idx ON student_journeys(journey_id);
ALTER TABLE student_journeys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_journeys_select" ON student_journeys;
CREATE POLICY "student_journeys_select" ON student_journeys FOR SELECT USING (true);
GRANT ALL    ON public.student_journeys TO service_role;
GRANT ALL    ON public.student_journeys TO authenticated;
GRANT SELECT ON public.student_journeys TO anon;

CREATE TABLE IF NOT EXISTS mission_started_by_student (
  id         TEXT        DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  student_id TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id TEXT        NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL DEFAULT 'started',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT mission_started_unique UNIQUE (student_id, mission_id)
);
ALTER TABLE mission_started_by_student ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.mission_started_by_student TO service_role;
GRANT ALL ON public.mission_started_by_student TO authenticated;

ALTER TABLE votes ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;
