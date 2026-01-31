import {
  pgSchema,
  pgTable,
  text,
  timestamp,
  time,
  integer,
  unique,
} from "drizzle-orm/pg-core";
import { appSchema } from "./users.js";
import { genderEnum, levelEnum } from "./enums.js";
import { teams } from "./teams.js";
import { tenants } from "./tenants.js";

export const leagues = appSchema.table("leagues", {
  id: text("id").primaryKey(),
  tenant_id: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  level: levelEnum("level").notNull(), // League level (2, 3, 4)
  gender: genderEnum("gender").notNull(), // League gender (male, female, mixed)
  start_date: timestamp("start_date"),
  end_date: timestamp("end_date"),
  created_by: text("created_by").notNull(), // Foreign key to users.id
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  tenantNameUnique: unique("leagues_tenant_name_unique").on(table.tenant_id, table.name),
}));

export const matches = appSchema.table("matches", {
  id: text("id").primaryKey(),
  league_id: text("league_id").notNull().references(() => leagues.id), // Foreign key to leagues.id
  home_team_id: text("home_team_id").notNull().references(() => teams.id), // Foreign key to teams.id
  away_team_id: text("away_team_id").notNull().references(() => teams.id), // Foreign key to teams.id
  match_date: timestamp("match_date").notNull(), // Date of the match
  match_time: time("match_time").notNull(), // Time of the match
  week_number: integer("week_number").notNull(), // Week number (1, 2, 3, etc.)
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const bye_weeks = appSchema.table("bye_weeks", {
  id: text("id").primaryKey(),
  league_id: text("league_id").notNull().references(() => leagues.id), // Foreign key to leagues.id
  team_id: text("team_id").notNull().references(() => teams.id), // Foreign key to teams.id
  week_number: integer("week_number").notNull(), // Week number (1, 2, 3, etc.)
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate bye weeks for same team in same week
  leagueTeamWeekUnique: unique("bye_weeks_league_team_week_unique").on(table.league_id, table.team_id, table.week_number),
}));

// Re-export enums for convenience
export { genderEnum, levelEnum };

// Export types
export type League = typeof leagues.$inferSelect;
export type NewLeague = typeof leagues.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type ByeWeek = typeof bye_weeks.$inferSelect;
export type NewByeWeek = typeof bye_weeks.$inferInsert;
export type Gender = (typeof genderEnum.enumValues)[number];
export type Level = (typeof levelEnum.enumValues)[number];
