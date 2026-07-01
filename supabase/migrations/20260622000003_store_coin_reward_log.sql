-- Migration: coin_reward_log
-- student_id is text (matches public.users.id type).
-- UNIQUE on (student_id, event_type, mission_id) is the deduplication guard.

CREATE TABLE IF NOT EXISTS coin_reward_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type  text NOT NULL CHECK (event_type IN (
                'goal_completion', 'first_vote', 'mission_complete', 'bonus_mission'
              )),
  amount      integer NOT NULL CHECK (amount > 0),
  mission_id  text,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (student_id, event_type, mission_id)
);

ALTER TABLE coin_reward_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_read_own_rewards"
  ON coin_reward_log FOR SELECT
  USING (auth.uid()::text = student_id);
