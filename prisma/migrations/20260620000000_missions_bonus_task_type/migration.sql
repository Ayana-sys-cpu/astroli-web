-- The "student project" concept has been replaced by a universal bonus task:
-- "Create an AI image that demonstrates your full understanding of this mission."
-- bonus_task_type documents which bonus task type applies (default and only value for now: 'ai_image').
-- project_description is retained for bot context (Orin uses it as mission background).

ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS bonus_task_type TEXT NOT NULL DEFAULT 'ai_image';

SELECT 'bonus_task_type column added to missions.' AS result;
