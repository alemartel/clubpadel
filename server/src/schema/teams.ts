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
import { leagues, levelEnum, genderEnum } from "./leagues";

export const teams = appSchema.table("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  level: levelEnum("level").notNull(), // Team level (2, 3, 4)
  gender: genderEnum("gender").notNull(), // Team gender (male, female, mixed)
  league_id: text("league_id"), // Foreign key to leagues.id (nullable)
  created_by: text("created_by").notNull(), // Foreign key to users.id
  passcode: text("passcode").notNull(), // Unique passcode for joining the team
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint on team name within league (only applies when league_id is not null)
  // Note: This constraint will be NULL for teams without leagues, allowing global team name uniqueness
  leagueNameUnique: unique("teams_league_name_unique").on(table.league_id, table.name),
  // Global unique constraint on team name regardless of league
  nameUnique: unique("teams_name_unique").on(table.name),
  // Unique constraint on passcode
  passcodeUnique: unique("teams_passcode_unique").on(table.passcode),
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

export const team_change_notifications = appSchema.table("team_change_notifications", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(), // Foreign key to users.id - The player who joined or left
  team_id: text("team_id").notNull(), // Foreign key to teams.id
  action: text("action").notNull(), // "joined" or "removed"
  created_at: timestamp("created_at").defaultNow().notNull(),
  read: boolean("read").default(false).notNull(),
  read_at: timestamp("read_at"),
});

export const team_leagues = appSchema.table("team_leagues", {
  id: text("id").primaryKey(),
  team_id: text("team_id").notNull(), // Foreign key to teams.id
  league_id: text("league_id").notNull(), // Foreign key to leagues.id
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate team-league associations
  teamLeagueUnique: unique("team_leagues_team_league_unique").on(table.team_id, table.league_id),
}));

// Export types
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof team_members.$inferSelect;
export type NewTeamMember = typeof team_members.$inferInsert;
export type TeamAvailability = typeof team_availability.$inferSelect;
export type NewTeamAvailability = typeof team_availability.$inferInsert;
export type TeamChangeNotification = typeof team_change_notifications.$inferSelect;
export type NewTeamChangeNotification = typeof team_change_notifications.$inferInsert;
export type TeamLeague = typeof team_leagues.$inferSelect;
export type NewTeamLeague = typeof team_leagues.$inferInsert;
