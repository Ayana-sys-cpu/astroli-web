-- Migration: atomic_increment_bot_cap
-- incrementFamilyBotCap (astorli-bot/lib/family-cap.ts) used to read the parent's
-- bot_conversations_used, add one in JS, and write the sum back in a separate
-- statement. Two conversations that overlapped both read the same value and both
-- wrote read+1, so the second write clobbered the first — the increment was lost
-- and the family's counter drifted below the real usage, letting them exceed the
-- paid monthly cap. (Observed 2026-07-16: 4 POSTs to /api/bot moved the counter
-- 0 -> 3, one increment lost.)
--
-- This function does the increment in a single UPDATE. Concurrent calls serialise
-- on the row lock, each adds exactly one, and none can overwrite another's result.
--
-- Note: users.id is TEXT in this schema (see family_track migration), so the
-- parameter is text, not uuid.
--
-- SECURITY INVOKER (default) on purpose: only service_role (the bot API routes)
-- may execute it, and service_role already holds the users table grants.

CREATE OR REPLACE FUNCTION public.increment_bot_cap(
  p_parent_id text
) RETURNS integer
LANGUAGE sql
AS $$
  UPDATE users
     SET bot_conversations_used = bot_conversations_used + 1
   WHERE id = p_parent_id
  RETURNING bot_conversations_used;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_bot_cap(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_bot_cap(text)
  TO service_role;
