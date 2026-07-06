-- Migration: grant_service_role_student_inventory
-- student_inventory (20260622000002) was created with RLS enabled but, like
-- coin_reward_log and student_coin_balances before the 20260702130000 fix,
-- was never GRANTed to service_role. RLS bypass (service_role has
-- rolbypassrls=true) only skips row-level policy checks -- it does not
-- substitute for the base table-level GRANT Postgres requires before any
-- role, including one that bypasses RLS, can touch a table.
--
-- Every service-role read/write to student_inventory (store/state,
-- store/purchase, store/equip routes) has been failing with 42501
-- permission denied since the table was created. Purchases deducted coins
-- (student_coin_balances had grants) but the purchased item was never
-- persisted, and the state route always returned owned: [] / equipped: {}
-- for every student regardless of real purchase history.

GRANT SELECT, INSERT, UPDATE ON student_inventory TO service_role;
