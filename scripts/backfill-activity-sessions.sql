-- One-off backfill: approximate historical activity sessions from bot-message
-- timestamps, for the founder's Pilot Review Dashboard (User Story 3).
--
-- NOT a migration — run manually (Supabase SQL editor, or:
--   npx prisma db execute --file scripts/backfill-activity-sessions.sql --schema prisma/schema.prisma
-- ). Rerunnable: wipes previous backfill rows first, never touches live
-- 'ping' rows.
--
-- Method: every bot message (messages + pip_messages), attributed to a
-- student via both historical key regimes (users.id and auth uid), sorted
-- per student; a gap > 30 minutes starts a new session — the same threshold
-- the live ping endpoint stitches with, so approximate and live sessions
-- mean the same thing. Rows land as platform='bot', source='backfill' and
-- are labeled "approx" in the admin UI.

BEGIN;

DELETE FROM student_activity_sessions WHERE source = 'backfill';

WITH student_message_times AS (
  SELECT COALESCE(u1.id, u2.id) AS student_id, m.created_at
  FROM messages m
  LEFT JOIN users u1 ON u1.id = m.student_id::text
  LEFT JOIN users u2 ON u2.auth_user_id = m.student_id
  WHERE COALESCE(u1.id, u2.id) IS NOT NULL

  UNION ALL

  SELECT u.id AS student_id, pm.created_at
  FROM pip_messages pm
  JOIN users u ON u.id = pm.student_id
),
gap_marked AS (
  SELECT
    student_id,
    created_at,
    CASE
      WHEN LAG(created_at) OVER per_student IS NULL
        OR created_at - LAG(created_at) OVER per_student > interval '30 minutes'
      THEN 1 ELSE 0
    END AS is_session_start
  FROM student_message_times
  WINDOW per_student AS (PARTITION BY student_id ORDER BY created_at)
),
session_grouped AS (
  SELECT
    student_id,
    created_at,
    SUM(is_session_start) OVER (PARTITION BY student_id ORDER BY created_at) AS session_number
  FROM gap_marked
)
INSERT INTO student_activity_sessions
  (student_id, platform, started_at, last_ping_at, ping_count, source)
SELECT
  student_id,
  'bot',
  MIN(created_at),
  MAX(created_at),
  COUNT(*)::integer,
  'backfill'
FROM session_grouped
GROUP BY student_id, session_number;

COMMIT;
