-- Add Pip's first-entrance opening_message to missions and plants.
-- NULL for any content that doesn't have one yet (e.g. future AI-generated content).
ALTER TABLE "missions" ADD COLUMN "opening_message" TEXT;
ALTER TABLE "plants"   ADD COLUMN "opening_message" TEXT;
