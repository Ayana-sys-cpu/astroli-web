-- Migration: add vote_sessions, scope votes per session
-- Run this in Supabase SQL Editor (or via prisma migrate deploy).

-- 0. Ensure set_updated_at trigger function exists
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Add vote_sessions table
CREATE TABLE IF NOT EXISTS vote_sessions (
  id          TEXT        DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  journey_id  TEXT        NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  ends_at     TIMESTAMPTZ,
  winner_id   TEXT,
  status      TEXT        NOT NULL DEFAULT 'open',
  CONSTRAINT vote_sessions_status_check CHECK (status IN ('open', 'concluded')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vote_sessions_journey_id_idx ON vote_sessions(journey_id);
CREATE INDEX IF NOT EXISTS vote_sessions_status_idx     ON vote_sessions(status);

CREATE TRIGGER vote_sessions_updated_at
  BEFORE UPDATE ON vote_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Add vote_session_id column to votes FIRST (before the data migration below)
ALTER TABLE votes ADD COLUMN IF NOT EXISTS vote_session_id TEXT REFERENCES vote_sessions(id) ON DELETE CASCADE;

-- 3. Migrate existing votes: create one concluded session per journey that had
--    vote_ends_at set, then attach all existing votes to it.
DO $$
DECLARE
  j RECORD;
  sess_id TEXT;
BEGIN
  FOR j IN
    SELECT id, vote_ends_at FROM journeys WHERE vote_ends_at IS NOT NULL
  LOOP
    INSERT INTO vote_sessions (journey_id, ends_at, status)
    VALUES (j.id, j.vote_ends_at, 'concluded')
    RETURNING id INTO sess_id;

    UPDATE votes
    SET vote_session_id = sess_id
    WHERE journey_id = j.id AND vote_session_id IS NULL;
  END LOOP;
END $$;

-- 4. Drop old per-journey unique constraint; add per-session constraint
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_student_id_journey_id_key;
ALTER TABLE votes ADD CONSTRAINT votes_student_session_unique UNIQUE (student_id, vote_session_id);

-- 5. Remove vote_ends_at from journeys (now owned by vote_sessions)
ALTER TABLE journeys DROP COLUMN IF EXISTS vote_ends_at;

-- 6. Rebuild vote_counts view to include vote_session_id
DROP VIEW IF EXISTS vote_counts;
CREATE VIEW vote_counts AS
  SELECT
    vote_session_id,
    journey_id,
    big_idea_id,
    COUNT(*) AS vote_count
  FROM votes
  GROUP BY vote_session_id, journey_id, big_idea_id;

GRANT SELECT ON vote_counts TO anon, authenticated;

-- 7. RLS for vote_sessions
ALTER TABLE vote_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vote_sessions_select" ON vote_sessions FOR SELECT USING (true);
