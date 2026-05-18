-- Replace MissionStatus enum (INACTIVE|ACTIVE|COMPLETED) with MissionState
-- (locked|voting|pending_start|active|completed|skipped).
-- Renames the column from "status" to "state".

-- Step 1: Create the new enum type
CREATE TYPE "MissionState" AS ENUM ('locked', 'voting', 'pending_start', 'active', 'completed', 'skipped');

-- Step 2: Add new column with safe default
ALTER TABLE "missions" ADD COLUMN "state" "MissionState" NOT NULL DEFAULT 'locked';

-- Step 3: Populate from old column, mapping legacy values
UPDATE "missions" SET "state" =
  CASE "status"
    WHEN 'ACTIVE'    THEN 'active'::"MissionState"
    WHEN 'COMPLETED' THEN 'completed'::"MissionState"
    ELSE                   'locked'::"MissionState"
  END;

-- Step 4: Remove old column
ALTER TABLE "missions" DROP COLUMN "status";

-- Step 5: Drop old enum (no longer referenced)
DROP TYPE "MissionStatus";
