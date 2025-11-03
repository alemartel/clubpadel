-- Migration: Remove groups concept
-- Applies to feature plan docs/features/0023_PLAN.md
-- Removes groups table and group_id references from teams and matches tables

-- Step 1: Drop foreign key constraints related to groups
ALTER TABLE "app"."matches" DROP CONSTRAINT IF EXISTS "matches_group_id_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "app"."teams" DROP CONSTRAINT IF EXISTS "teams_group_id_groups_id_fk";
--> statement-breakpoint

-- Step 2: Remove group_id columns from tables
ALTER TABLE "app"."matches" DROP COLUMN IF EXISTS "group_id";
--> statement-breakpoint
ALTER TABLE "app"."teams" DROP COLUMN IF EXISTS "group_id";
--> statement-breakpoint

-- Step 3: Drop groups table
DROP TABLE IF EXISTS "app"."groups";
--> statement-breakpoint

