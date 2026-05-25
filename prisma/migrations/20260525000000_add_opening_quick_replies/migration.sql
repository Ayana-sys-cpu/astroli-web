-- Add optional quick-reply buttons to opening messages on Mission and Plant.
-- Stored as JSON array of {label, value} objects.
-- Null = no buttons (free-text mode). Populated for messages that frame a binary choice.

ALTER TABLE "missions" ADD COLUMN "opening_quick_replies" JSONB;
ALTER TABLE "plants"   ADD COLUMN "opening_quick_replies" JSONB;
