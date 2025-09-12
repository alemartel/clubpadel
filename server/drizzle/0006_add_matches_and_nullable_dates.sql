-- Create matches table
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

-- Make league dates nullable
ALTER TABLE "app"."leagues" ALTER COLUMN "start_date" DROP NOT NULL;
ALTER TABLE "app"."leagues" ALTER COLUMN "end_date" DROP NOT NULL;

-- Set existing league dates to NULL
UPDATE "app"."leagues" SET "start_date" = NULL, "end_date" = NULL;

-- Add foreign key constraints for matches table
DO $$ BEGIN
 ALTER TABLE "app"."matches" ADD CONSTRAINT "matches_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "app"."leagues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "app"."matches" ADD CONSTRAINT "matches_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "app"."groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "app"."matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "app"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "app"."matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "app"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
