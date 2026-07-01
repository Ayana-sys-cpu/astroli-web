-- i18n: translated content per language
-- Keyed as { "he": { field_name: "translated value", ... } }
-- Populated automatically when teacher sets missions.language = 'he'.
-- Student API routes merge these fields over English when serving Hebrew content.

ALTER TABLE missions ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}';
ALTER TABLE planets  ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}';

SELECT 'translations column added to missions and planets.' AS result;
