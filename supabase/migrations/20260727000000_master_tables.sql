-- Migration: master_tables
-- Master: the student curiosity hub — saved edits and Orin deep-dive sessions.
-- Every table holds student data (minors) — RLS is enabled on all of them.
-- student_id is the app users.id, stored as text to match feed_events.

-- ── master_saves ──────────────────────────────────────────────────────────────
-- One row per item a student keeps on their shelf. Either a feed edit or a
-- kept deep-dive session — never both.
CREATE TABLE IF NOT EXISTS master_saves (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      text        NOT NULL,
  edit_id         uuid        REFERENCES feed_edits(id) ON DELETE CASCADE,
  dive_session_id uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT master_saves_one_target CHECK (
    (edit_id IS NOT NULL AND dive_session_id IS NULL)
    OR (edit_id IS NULL AND dive_session_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS master_saves_student_edit_key
  ON master_saves (student_id, edit_id) WHERE edit_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS master_saves_student_dive_key
  ON master_saves (student_id, dive_session_id) WHERE dive_session_id IS NOT NULL;

-- Shelf query: newest save first, id as tiebreaker for identical timestamps.
CREATE INDEX IF NOT EXISTS master_saves_student_created_idx
  ON master_saves (student_id, created_at DESC, id DESC);

ALTER TABLE master_saves ENABLE ROW LEVEL SECURITY;

-- ── master_dive_sessions ──────────────────────────────────────────────────────
-- One conversation between one student and Orin, scoped to a topic.
CREATE TABLE IF NOT EXISTS master_dive_sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      text        NOT NULL,
  origin          text        NOT NULL CHECK (origin IN ('edit','search','chip')),
  edit_id         uuid        REFERENCES feed_edits(id) ON DELETE SET NULL,
  topic           text        NOT NULL,
  status          text        NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS master_dive_sessions_student_recent_idx
  ON master_dive_sessions (student_id, last_message_at DESC);

-- Resume lookup: newest active session for a given edit.
CREATE INDEX IF NOT EXISTS master_dive_sessions_student_edit_idx
  ON master_dive_sessions (student_id, edit_id, status);

ALTER TABLE master_dive_sessions ENABLE ROW LEVEL SECURITY;

-- master_saves.dive_session_id points at a session; drop the save with it.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'master_saves_dive_session_fk'
  ) THEN
    ALTER TABLE master_saves
      ADD CONSTRAINT master_saves_dive_session_fk
      FOREIGN KEY (dive_session_id) REFERENCES master_dive_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── master_dive_messages ──────────────────────────────────────────────────────
-- One row per turn. segments holds the ordered typed segments of that turn
-- (text | visual | media) — see specs/student/web-app/master/data-model.md.
CREATE TABLE IF NOT EXISTS master_dive_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid        NOT NULL REFERENCES master_dive_sessions(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('student','orin')),
  segments   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS master_dive_messages_session_idx
  ON master_dive_messages (session_id, created_at, id);

ALTER TABLE master_dive_messages ENABLE ROW LEVEL SECURITY;

-- ── RLS policies ──────────────────────────────────────────────────────────────
-- Students touch their own rows only. Same JWT claim pattern as feed_events.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'students read own master saves' AND tablename = 'master_saves') THEN
    CREATE POLICY "students read own master saves"
      ON master_saves FOR SELECT
      USING (student_id = current_setting('request.jwt.claims', true)::json->>'student_id');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'students insert own master saves' AND tablename = 'master_saves') THEN
    CREATE POLICY "students insert own master saves"
      ON master_saves FOR INSERT
      WITH CHECK (student_id = current_setting('request.jwt.claims', true)::json->>'student_id');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'students delete own master saves' AND tablename = 'master_saves') THEN
    CREATE POLICY "students delete own master saves"
      ON master_saves FOR DELETE
      USING (student_id = current_setting('request.jwt.claims', true)::json->>'student_id');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'students read own dive sessions' AND tablename = 'master_dive_sessions') THEN
    CREATE POLICY "students read own dive sessions"
      ON master_dive_sessions FOR SELECT
      USING (student_id = current_setting('request.jwt.claims', true)::json->>'student_id');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'students insert own dive sessions' AND tablename = 'master_dive_sessions') THEN
    CREATE POLICY "students insert own dive sessions"
      ON master_dive_sessions FOR INSERT
      WITH CHECK (student_id = current_setting('request.jwt.claims', true)::json->>'student_id');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'students read own dive messages' AND tablename = 'master_dive_messages') THEN
    CREATE POLICY "students read own dive messages"
      ON master_dive_messages FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM master_dive_sessions s
        WHERE s.id = master_dive_messages.session_id
          AND s.student_id = current_setting('request.jwt.claims', true)::json->>'student_id'
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'students insert own dive messages' AND tablename = 'master_dive_messages') THEN
    CREATE POLICY "students insert own dive messages"
      ON master_dive_messages FOR INSERT
      WITH CHECK (EXISTS (
        SELECT 1 FROM master_dive_sessions s
        WHERE s.id = master_dive_messages.session_id
          AND s.student_id = current_setting('request.jwt.claims', true)::json->>'student_id'
      ));
  END IF;
END $$;

-- ── Grants ────────────────────────────────────────────────────────────────────
GRANT ALL ON TABLE master_saves TO postgres, service_role;
GRANT ALL ON TABLE master_dive_sessions TO postgres, service_role;
GRANT ALL ON TABLE master_dive_messages TO postgres, service_role;
GRANT SELECT, INSERT, DELETE ON TABLE master_saves TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE master_dive_sessions TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE master_dive_messages TO anon, authenticated;
