CREATE TABLE IF NOT EXISTS "app"."matches" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"group_id" text NOT NULL,
	"home_team_id" text NOT NULL,
	"away_team_id" text NOT NULL,
	"match_date" timestamp NOT NULL,
	"match_time" time NOT NULL,
	"week_number" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."leagues" ALTER COLUMN "start_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."leagues" ALTER COLUMN "end_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN IF NOT EXISTS "dni" text;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN IF NOT EXISTS "tshirt_size" text;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN IF NOT EXISTS "profile_picture_url" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app"."matches" ADD CONSTRAINT "matches_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "app"."leagues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app"."matches" ADD CONSTRAINT "matches_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "app"."groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
 WHEN SQLSTATE '42703' THEN null;  -- undefined_column (column group_id does not exist)
 WHEN SQLSTATE '42P01' THEN null;  -- undefined_table (groups table dropped by 0018)
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app"."matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "app"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app"."matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "app"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
