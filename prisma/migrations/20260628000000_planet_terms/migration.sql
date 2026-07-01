-- Add terms JSONB column to planets table.
-- Stores an array of key term strings introduced during planet exploration.
-- English terms go in the root column; Hebrew (and other) translations go in
-- the existing translations JSONB: { "he": { "terms": ["...", "..."] } }

ALTER TABLE planets
  ADD COLUMN IF NOT EXISTS terms JSONB NOT NULL DEFAULT '[]';

SELECT 'terms column added to planets.' AS result;
