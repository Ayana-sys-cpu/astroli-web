-- Journey Language Picker
-- Spec: specs/parent/web-app/journey-language-picker/spec.md
-- Data model: specs/parent/web-app/journey-language-picker/data-model.md
--
-- Additive only. No rows modified. Safe to apply to production.
-- DEFAULT 'en' on both columns means zero backfill needed.

-- journeys: tag each template with its content language
ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

ALTER TABLE journeys DROP CONSTRAINT IF EXISTS journeys_language_check;
ALTER TABLE journeys ADD CONSTRAINT journeys_language_check
  CHECK (language IN ('en', 'he'));

CREATE INDEX IF NOT EXISTS journeys_language_idx ON journeys(language);

-- classes: store the language the parent chose during onboarding
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_language_check;
ALTER TABLE classes ADD CONSTRAINT classes_language_check
  CHECK (language IN ('en', 'he'));
