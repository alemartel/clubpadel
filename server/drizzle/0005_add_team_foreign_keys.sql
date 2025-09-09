-- Add foreign key constraints for teams and team_members tables
ALTER TABLE "app"."teams" ADD CONSTRAINT "teams_league_id_leagues_id_fk" 
  FOREIGN KEY ("league_id") REFERENCES "app"."leagues"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "app"."teams" ADD CONSTRAINT "teams_group_id_groups_id_fk" 
  FOREIGN KEY ("group_id") REFERENCES "app"."groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "app"."teams" ADD CONSTRAINT "teams_created_by_users_id_fk" 
  FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "app"."team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" 
  FOREIGN KEY ("team_id") REFERENCES "app"."teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "app"."team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
