-- Journey-level language setting.
-- When a teacher sets their class language to 'he', mission content is served
-- from missions.translations.he (populated automatically by translate-mission.ts).

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en'
  CHECK (language IN ('en', 'he'));

SELECT 'language column added to classes.' AS result;
