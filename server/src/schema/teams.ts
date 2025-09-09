import {
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { appSchema, users } from "./users";
import { leagues, groups } from "./leagues";

export const teams = appSchema.table("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  league_id: text("league_id").notNull(), // Foreign key to leagues.id
  group_id: text("group_id").notNull(), // Foreign key to groups.id
  created_by: text("created_by").notNull(), // Foreign key to users.id
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint on team name within league
  leagueNameUnique: unique("teams_league_name_unique").on(table.league_id, table.name),
}));

export const team_members = appSchema.table("team_members", {
  id: text("id").primaryKey(),
  team_id: text("team_id").notNull(), // Foreign key to teams.id
  user_id: text("user_id").notNull(), // Foreign key to users.id
  role: text("role").default("member").notNull(), // Future extensibility for captain/co-captain roles
  joined_at: timestamp("joined_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate memberships
  teamUserUnique: unique("team_members_team_user_unique").on(table.team_id, table.user_id),
}));

// Export types
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof team_members.$inferSelect;
export type NewTeamMember = typeof team_members.$inferInsert;
