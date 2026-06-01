-- =============================================================================
-- Add vote_sessions table + Pip-guide UI metadata columns.
--
-- vote_sessions did not exist in the live DB (the Prisma migration was never
-- applied via `prisma migrate deploy`). Creating it here from scratch.
-- All missions/planets columns use IF NOT EXISTS so re-running is safe.
-- =============================================================================

-- ── 1. Ensure set_updated_at trigger function exists ─────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 2. Create vote_sessions (idempotent) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS vote_sessions (
  id          TEXT        DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  journey_id  TEXT        NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  winner_id   TEXT,
  status      TEXT        NOT NULL DEFAULT 'open',
  CONSTRAINT vote_sessions_status_check CHECK (status IN ('open', 'concluded')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vote_sessions_journey_id_idx ON vote_sessions(journey_id);
CREATE INDEX IF NOT EXISTS vote_sessions_status_idx     ON vote_sessions(status);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS vote_sessions_updated_at ON vote_sessions;
CREATE TRIGGER vote_sessions_updated_at
  BEFORE UPDATE ON vote_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS + grants (table was created outside Supabase dashboard so needs explicit grants)
ALTER TABLE vote_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vote_sessions_select" ON vote_sessions;
CREATE POLICY "vote_sessions_select" ON vote_sessions FOR SELECT USING (true);

GRANT ALL    ON public.vote_sessions TO service_role;
GRANT ALL    ON public.vote_sessions TO authenticated;
GRANT SELECT ON public.vote_sessions TO anon;

-- ── 3. Pip-guide display metadata on missions ─────────────────────────────────
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS chapter             TEXT,
  ADD COLUMN IF NOT EXISTS mission_brief       TEXT,
  ADD COLUMN IF NOT EXISTS opening_message_2   TEXT,
  ADD COLUMN IF NOT EXISTS world_brief_summary TEXT,
  ADD COLUMN IF NOT EXISTS world_brief_items   JSONB,
  ADD COLUMN IF NOT EXISTS qa_answers          JSONB,
  ADD COLUMN IF NOT EXISTS mission_qa_answers  JSONB;

-- ── 4. Icon + hint on planets ─────────────────────────────────────────────────
ALTER TABLE planets
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS hint TEXT;
