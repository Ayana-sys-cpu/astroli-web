-- Migration: reframe real_world_task -> real_world_connection
-- The "real-world task" edit type is reframed from a hands-on activity into a
-- passive "real-world connection" (aha) card. This:
--   1. renames the edit_type value real_world_task -> real_world_connection
--   2. removes the now-obsolete 'task_done' engagement event (the "Did it!" button
--      is gone — a connection card has nothing to do)
--   3. removes the 9 old task-format draft cards (obsolete under the reframe;
--      never went live) so the library only holds real connection cards.
--
-- Idempotent: safe to re-run. Only touches CHECK constraints + data.

-- 1a. Retire obsolete task-format drafts (they were the wrong format, never live).
--     Clear any dependent events first (feed_events has no ON DELETE CASCADE).
DELETE FROM feed_events WHERE edit_id IN (SELECT id FROM feed_edits WHERE edit_type = 'real_world_task');
DELETE FROM feed_edits WHERE edit_type = 'real_world_task';

-- 1b. (defensive) rename any survivors rather than orphan them.
UPDATE feed_edits SET edit_type = 'real_world_connection' WHERE edit_type = 'real_world_task';

-- 1c. Swap the edit_type CHECK constraint to the new allowed set.
ALTER TABLE feed_edits DROP CONSTRAINT IF EXISTS feed_edits_edit_type_check;
ALTER TABLE feed_edits ADD CONSTRAINT feed_edits_edit_type_check
  CHECK (edit_type IN ('did_you_know','inspiring_human','real_world_connection'));

-- 2a. Remove obsolete task_done events (0 exist; defensive).
DELETE FROM feed_events WHERE action = 'task_done';

-- 2b. Swap the action CHECK constraint to drop 'task_done'.
ALTER TABLE feed_events DROP CONSTRAINT IF EXISTS feed_events_action_check;
ALTER TABLE feed_events ADD CONSTRAINT feed_events_action_check
  CHECK (action IN ('impression','dwell','like','comment','learn_more','skip'));
