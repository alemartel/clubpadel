DO $$ BEGIN
 CREATE TYPE "level_validation_status" AS ENUM('none', 'pending', 'approved', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app"."team_members" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app"."teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"league_id" text NOT NULL,
	"group_id" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN IF NOT EXISTS "claimed_level" "level";--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN IF NOT EXISTS "level_validation_status" "level_validation_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN IF NOT EXISTS "level_validated_at" timestamp;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN IF NOT EXISTS "level_validated_by" text;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN IF NOT EXISTS "level_validation_notes" text;