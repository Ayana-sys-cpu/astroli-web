-- =============================================================================
-- Fix missing column defaults on journeys, missions, and planets.
--
-- The original Prisma migration created these tables with TEXT/TIMESTAMP
-- columns marked NOT NULL but with no DB-level defaults. Prisma normally
-- injects these values at the application layer, but direct Supabase API
-- calls (supabaseAdmin.upsert / insert) bypass Prisma and hit the DB
-- directly — causing NOT NULL constraint violations on id, created_at,
-- and updated_at.
--
-- This migration adds DB-level defaults so any insert path works correctly.
-- =============================================================================

-- journeys
ALTER TABLE journeys ALTER COLUMN id         SET DEFAULT gen_random_uuid()::TEXT;
ALTER TABLE journeys ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE journeys ALTER COLUMN updated_at SET DEFAULT now();

-- missions
ALTER TABLE missions ALTER COLUMN id         SET DEFAULT gen_random_uuid()::TEXT;
ALTER TABLE missions ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE missions ALTER COLUMN updated_at SET DEFAULT now();

-- planets
ALTER TABLE planets  ALTER COLUMN id         SET DEFAULT gen_random_uuid()::TEXT;
ALTER TABLE planets  ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE planets  ALTER COLUMN updated_at SET DEFAULT now();
