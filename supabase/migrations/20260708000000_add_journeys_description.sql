-- journeys.description was missing from the live schema.
-- The parent onboarding route selects this column; its absence caused
-- PostgREST to return 400 → the route returned 500 → journeys never loaded.

ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
