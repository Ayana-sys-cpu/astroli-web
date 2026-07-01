-- Add translations JSONB to planet_teaching_goals.
-- Same pattern as missions and planets: { "he": { "slug_label": "...", "description": "..." } }

ALTER TABLE planet_teaching_goals
  ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}';

SELECT 'translations column added to planet_teaching_goals.' AS result;
