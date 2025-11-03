-- Migration: Add level and gender to leagues
-- Applies to feature plan docs/features/0022_PLAN.md
-- Adds level and gender fields to leagues table

-- Add level column to leagues table
ALTER TABLE "app"."leagues" ADD COLUMN IF NOT EXISTS "level" "level";
--> statement-breakpoint

-- Add gender column to leagues table
ALTER TABLE "app"."leagues" ADD COLUMN IF NOT EXISTS "gender" "gender";
--> statement-breakpoint

-- Set default values for existing leagues (if any exist)
-- Default to level 2 and gender mixed
UPDATE "app"."leagues" SET "level" = '2' WHERE "level" IS NULL;
--> statement-breakpoint

UPDATE "app"."leagues" SET "gender" = 'mixed' WHERE "gender" IS NULL;
--> statement-breakpoint

-- Make level and gender NOT NULL after setting defaults
ALTER TABLE "app"."leagues" ALTER COLUMN "level" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "app"."leagues" ALTER COLUMN "gender" SET NOT NULL;
--> statement-breakpoint

