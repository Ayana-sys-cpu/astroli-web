-- Migration: vote_indexes
-- vote_sessions.class_id and votes.vote_session_id are filtered on every
-- home/vote/landscape load, but no migration ever created covering indexes.
-- The original journey_id indexes were dropped with their columns in
-- 20260616000001_classes_split_cleanup when votes/vote_sessions were
-- repointed to class_id, and prisma/schema.prisma's @@index declarations
-- never generate SQL (`prisma migrate deploy` only replays migration files).
-- Without them the vote_counts view seq-scans all votes ever cast, amplified
-- by a realtime refetch on every vote broadcast during live voting.

-- Serves every vote_sessions lookup shape in the app: class_id alone
-- (teacher journeys list), class_id + status = 'open' (home/vote/landscape
-- hot path), and class_id + status = 'concluded' (pending-enrollment check).
CREATE INDEX IF NOT EXISTS vote_sessions_class_id_status_idx
  ON vote_sessions (class_id, status);

-- vote_counts groups by (vote_session_id, class_id, big_idea_id) filtered on
-- vote_session_id — matching all three columns makes the count index-only.
CREATE INDEX IF NOT EXISTS votes_vote_session_id_class_id_big_idea_id_idx
  ON votes (vote_session_id, class_id, big_idea_id);

-- Closes the drift with prisma/schema.prisma's @@index([classId]) and keeps
-- the classes ON DELETE CASCADE from scanning votes.
CREATE INDEX IF NOT EXISTS votes_class_id_idx
  ON votes (class_id);
