-- Migration: allow 'planet_complete' as a coin_reward_log event type
-- Splits the old (mislabeled) 'mission_complete' event, which actually fired
-- per single planet completion, into two real tiers:
--   planet_complete  — awarded when a student finishes one planet
--   mission_complete — awarded when every planet in a mission is finished

ALTER TABLE coin_reward_log DROP CONSTRAINT coin_reward_log_event_type_check;

ALTER TABLE coin_reward_log ADD CONSTRAINT coin_reward_log_event_type_check
  CHECK (event_type IN (
    'goal_completion', 'first_vote', 'planet_complete', 'mission_complete', 'bonus_mission'
  ));
