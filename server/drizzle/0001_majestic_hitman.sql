DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('admin', 'player');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN IF NOT EXISTS "role" "user_role" DEFAULT 'player' NOT NULL;