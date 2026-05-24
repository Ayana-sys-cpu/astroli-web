-- Add starts_at to vote_sessions so votes can be scheduled to open at a
-- future date/time. Students only see the vote once starts_at has passed.
-- NULL means "open immediately" (backwards-compatible with existing rows).

ALTER TABLE vote_sessions ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
