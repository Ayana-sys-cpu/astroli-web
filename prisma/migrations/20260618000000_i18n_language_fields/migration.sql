-- i18n: mission content language
-- Teacher sets the language per mission; students see all mission content in that language.

ALTER TABLE missions ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en'
  CHECK (language IN ('en', 'he'));

SELECT 'missions.language column added.' AS result;
