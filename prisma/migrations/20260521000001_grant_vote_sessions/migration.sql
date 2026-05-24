-- Grant missing privileges on vote_sessions to Supabase roles.
-- The table was created via raw migration (not the Dashboard), so automatic
-- grants were never applied. Without these, service_role gets 403 on INSERT/UPDATE.

GRANT ALL   ON public.vote_sessions TO service_role;
GRANT ALL   ON public.vote_sessions TO authenticated;
GRANT SELECT ON public.vote_sessions TO anon;
