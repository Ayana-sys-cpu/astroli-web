-- Migration: feed_tables
-- Learning Feed: edit library, engagement tracking, and comment moderation.
-- All three tables store student data — RLS is enabled on every table.
-- Media is served from Supabase Storage bucket 'feed-media' (created below).

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- Public-read bucket; only the service role (generation script) can write.
INSERT INTO storage.buckets (id, name, public)
VALUES ('feed-media', 'feed-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public (anon) reads so students can load media URLs without a token.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'feed-media public read' AND schemaname = 'storage' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "feed-media public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'feed-media');
  END IF;
END $$;

-- ── feed_edits ────────────────────────────────────────────────────────────────
-- The shared edit library. One row per generated edit, shared by all students.
-- Never keyed per student — personal variation is in the feed scoring algorithm.
CREATE TABLE IF NOT EXISTS feed_edits (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  edit_type        text        NOT NULL
                               CHECK (edit_type IN ('did_you_know','inspiring_human','real_world_task')),
  planet_id        text        NOT NULL REFERENCES planets(id),
  interest_theme   text,
  hook             text        NOT NULL,
  body             text        NOT NULL,
  bridge           text        NOT NULL,
  media_url        text        NOT NULL,
  media_type       text        NOT NULL DEFAULT 'image'
                               CHECK (media_type IN ('image','video')),
  media_credit     text        NOT NULL,
  media_license    text        NOT NULL,
  media_source_url text,
  source_url       text        NOT NULL,
  language         text        NOT NULL DEFAULT 'en',
  status           text        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','live','retired','rejected')),
  rejection_reason text,
  safety_pass      boolean     NOT NULL DEFAULT false,
  safety_reason    text,
  generated_at     timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Idempotent for DBs created before the column existed (dedupe key —
-- the original third-party URL; no media item may ever be used twice).
ALTER TABLE feed_edits ADD COLUMN IF NOT EXISTS media_source_url text;

CREATE INDEX IF NOT EXISTS feed_edits_planet_status_idx
  ON feed_edits (planet_id, status);

CREATE INDEX IF NOT EXISTS feed_edits_type_theme_status_idx
  ON feed_edits (edit_type, interest_theme, status);

ALTER TABLE feed_edits ENABLE ROW LEVEL SECURITY;

-- Students see live edits only.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'students read live feed edits' AND tablename = 'feed_edits'
  ) THEN
    CREATE POLICY "students read live feed edits"
      ON feed_edits FOR SELECT
      USING (status = 'live');
  END IF;
END $$;

-- ── feed_events ───────────────────────────────────────────────────────────────
-- Append-only engagement log. One row per student action on one edit.
-- Powers the scoring algorithm and founder analytics.
CREATE TABLE IF NOT EXISTS feed_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text        NOT NULL,
  edit_id    uuid        NOT NULL REFERENCES feed_edits(id),
  action     text        NOT NULL
             CHECK (action IN ('impression','dwell','like','comment','learn_more','task_done','skip')),
  value      numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feed_events_student_edit_idx
  ON feed_events (student_id, edit_id);

CREATE INDEX IF NOT EXISTS feed_events_student_action_idx
  ON feed_events (student_id, action, created_at DESC);

ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;

-- Students may insert and read their own events only.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'students insert own feed events' AND tablename = 'feed_events'
  ) THEN
    CREATE POLICY "students insert own feed events"
      ON feed_events FOR INSERT
      WITH CHECK (student_id = current_setting('request.jwt.claims', true)::json->>'student_id');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'students read own feed events' AND tablename = 'feed_events'
  ) THEN
    CREATE POLICY "students read own feed events"
      ON feed_events FOR SELECT
      USING (student_id = current_setting('request.jwt.claims', true)::json->>'student_id');
  END IF;
END $$;

-- ── feed_edit_comments ────────────────────────────────────────────────────────
-- Student comments on edits. All new comments land as 'pending' and require
-- human moderation before any other student can see them (COPPA — minors).
CREATE TABLE IF NOT EXISTS feed_edit_comments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_edit_id      uuid        NOT NULL REFERENCES feed_edits(id) ON DELETE CASCADE,
  author_id         text        NOT NULL,
  body              text        NOT NULL CHECK (char_length(body) <= 280),
  moderation_status text        NOT NULL DEFAULT 'pending'
                                CHECK (moderation_status IN ('pending','approved','rejected')),
  moderated_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feed_edit_comments_edit_status_idx
  ON feed_edit_comments (feed_edit_id, moderation_status);

CREATE INDEX IF NOT EXISTS feed_edit_comments_author_idx
  ON feed_edit_comments (author_id);

-- Admin moderation queue: order by newest pending first.
CREATE INDEX IF NOT EXISTS feed_edit_comments_moderation_queue_idx
  ON feed_edit_comments (moderation_status, created_at DESC);

ALTER TABLE feed_edit_comments ENABLE ROW LEVEL SECURITY;

-- Students may INSERT their own comments.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'students insert own feed comments' AND tablename = 'feed_edit_comments'
  ) THEN
    CREATE POLICY "students insert own feed comments"
      ON feed_edit_comments FOR INSERT
      WITH CHECK (author_id = current_setting('request.jwt.claims', true)::json->>'student_id');
  END IF;
END $$;

-- Students may SELECT approved comments plus their own pending comments.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'students read approved and own pending comments' AND tablename = 'feed_edit_comments'
  ) THEN
    CREATE POLICY "students read approved and own pending comments"
      ON feed_edit_comments FOR SELECT
      USING (
        moderation_status = 'approved'
        OR author_id = current_setting('request.jwt.claims', true)::json->>'student_id'
      );
  END IF;
END $$;

-- ── Grants ────────────────────────────────────────────────────────────────────
-- Required when migration is applied via Management API (not supabase CLI),
-- which does not auto-apply the default Supabase role grants.
GRANT ALL ON TABLE feed_edits TO postgres, service_role;
GRANT ALL ON TABLE feed_events TO postgres, service_role;
GRANT ALL ON TABLE feed_edit_comments TO postgres, service_role;
GRANT SELECT, INSERT ON TABLE feed_edits TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE feed_events TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE feed_edit_comments TO anon, authenticated;
