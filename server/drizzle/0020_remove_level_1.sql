-- Migration: Remove level 1 from level enum
-- Removes "1" from the level enum type, keeping only levels 2, 3, and 4
-- Since PostgreSQL doesn't support DROP VALUE in all versions, we recreate the enum

-- Step 1: Update any existing data that uses level "1" to level "2" as default
-- This handles teams and leagues that might have level 1
UPDATE "app"."teams" SET "level" = '2' WHERE "level" = '1';
--> statement-breakpoint

UPDATE "app"."leagues" SET "level" = '2' WHERE "level" = '1';
--> statement-breakpoint

-- Step 2: Recreate the enum without "1"
-- Create a new enum type without level 1
CREATE TYPE "level_new" AS ENUM ('2', '3', '4');
--> statement-breakpoint

-- Step 3: Update all columns that use the old enum to use the new one
ALTER TABLE "app"."teams" ALTER COLUMN "level" TYPE "level_new" USING "level"::text::"level_new";
--> statement-breakpoint

ALTER TABLE "app"."leagues" ALTER COLUMN "level" TYPE "level_new" USING "level"::text::"level_new";
--> statement-breakpoint

-- Step 4: Drop the old enum and rename the new one
DROP TYPE "level";
--> statement-breakpoint

ALTER TYPE "level_new" RENAME TO "level";
--> statement-breakpoint

