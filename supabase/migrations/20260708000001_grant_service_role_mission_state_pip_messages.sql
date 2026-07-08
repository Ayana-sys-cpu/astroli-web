-- student_mission_state and pip_messages were created with RLS enabled
-- but never GRANTed to service_role. Same pattern as coin_reward_log /
-- student_inventory fixes (20260702130000, 20260706210718).
-- Without these grants PostgREST returns 403 even for the service role.

GRANT SELECT, INSERT, UPDATE, DELETE ON student_mission_state TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON pip_messages           TO service_role;
