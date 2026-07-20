-- Learning Feed amendment (2026-07-20): per-card podcast audio + background music.
-- Idempotent: safe to re-run.

-- 1. Podcast episode + background music track on each edit.
--    Both nullable — a card without audio shows no podcast button (FR-026),
--    a card without music plays nothing (FR-031).
ALTER TABLE feed_edits ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE feed_edits ADD COLUMN IF NOT EXISTS audio_status text
  CHECK (audio_status IN ('generating','ready','failed'));
ALTER TABLE feed_edits ADD COLUMN IF NOT EXISTS music_url text;

-- 2. 'listen' engagement event (FR-029).
ALTER TABLE feed_events DROP CONSTRAINT IF EXISTS feed_events_action_check;
ALTER TABLE feed_events ADD CONSTRAINT feed_events_action_check
  CHECK (action IN ('impression','dwell','like','comment','learn_more','skip','listen'));

-- 3. Storage buckets: podcast episodes + curated music pack.
--    Public read, uploads only via service role (COPPA — students never upload,
--    and only stream from our own storage).
INSERT INTO storage.buckets (id, name, public)
VALUES ('feed-audio', 'feed-audio', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('feed-music', 'feed-music', true)
ON CONFLICT (id) DO NOTHING;
