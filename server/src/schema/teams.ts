import {
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
  boolean,
  time,
  numeric,
} from "drizzle-orm/pg-core";
import { appSchema, users } from "./users";
import { leagues, groups, levelEnum, genderEnum } from "./leagues";

export const teams = appSchema.table("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  level: levelEnum("level").notNull(), // Team level (1, 2, 3, 4)
  gender: genderEnum("gender").notNull(), // Team gender (male, female, mixed)
  league_id: text("league_id"), // Foreign key to leagues.id (nullable)
  group_id: text("group_id"), // Foreign key to groups.id (nullable)
  created_by: text("created_by").notNull(), // Foreign key to users.id
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint on team name within league (only applies when league_id is not null)
  // Note: This constraint will be NULL for teams without leagues, allowing global team name uniqueness
  leagueNameUnique: unique("teams_league_name_unique").on(table.league_id, table.name),
}));

export const team_members = appSchema.table("team_members", {
  id: text("id").primaryKey(),
  team_id: text("team_id").notNull(), // Foreign key to teams.id
  user_id: text("user_id").notNull(), // Foreign key to users.id
  joined_at: timestamp("joined_at").defaultNow().notNull(),
  paid: boolean("paid").default(false).notNull(),
  paid_at: timestamp("paid_at"),
  paid_amount: numeric("paid_amount", { precision: 10, scale: 2 }),
}, (table) => ({
  // Unique constraint to prevent duplicate memberships
  teamUserUnique: unique("team_members_team_user_unique").on(table.team_id, table.user_id),
}));

export const team_availability = appSchema.table("team_availability", {
  id: text("id").primaryKey(),
  team_id: text("team_id").notNull(), // Foreign key to teams.id
  day_of_week: text("day_of_week").notNull(), // 'monday', 'tuesday', etc.
  is_available: boolean("is_available").default(false).notNull(),
  start_time: time("start_time"), // e.g., '09:00:00'
  end_time: time("end_time"), // e.g., '17:00:00'
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate availability entries for same team/day
  teamDayUnique: unique("team_availability_team_day_unique").on(table.team_id, table.day_of_week),
}));

// Export types
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof team_members.$inferSelect;
export type NewTeamMember = typeof team_members.$inferInsert;
export type TeamAvailability = typeof team_availability.$inferSelect;
export type NewTeamAvailability = typeof team_availability.$inferInsert;
