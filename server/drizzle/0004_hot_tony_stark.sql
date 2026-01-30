DO $$ BEGIN
 ALTER TABLE "app"."team_members" ADD CONSTRAINT "team_members_team_user_unique" UNIQUE("team_id","user_id");
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app"."teams" ADD CONSTRAINT "teams_league_name_unique" UNIQUE("league_id","name");
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END $$;