-- Add a short one-word display label to plants.
-- Nullable so existing rows (already seeded without a label) are not broken.
-- Future plants inserted via connect/route.ts will always include a label.
ALTER TABLE plants ADD COLUMN IF NOT EXISTS label TEXT;
