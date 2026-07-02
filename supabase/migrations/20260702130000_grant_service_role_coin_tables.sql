-- Migration: grant_service_role_coin_tables
-- coin_reward_log and student_coin_balances were created (20260622000001,
-- 20260622000003) with RLS enabled and a student-facing SELECT policy, but
-- were never GRANTed to service_role. RLS bypass (service_role has
-- rolbypassrls=true) only skips row-level policy checks -- it does not
-- substitute for the base table-level GRANT Postgres requires before any
-- role, including one that bypasses RLS, can touch a table.
--
-- Every service-role write to these two tables has been failing with
-- 42501 permission denied since the tables were created. The app's error
-- handling silently swallowed the failure and treated it as "already
-- awarded", so no goal/planet/mission coin reward has ever actually been
-- persisted.

GRANT SELECT, INSERT ON coin_reward_log TO service_role;
GRANT SELECT, INSERT, UPDATE ON student_coin_balances TO service_role;
