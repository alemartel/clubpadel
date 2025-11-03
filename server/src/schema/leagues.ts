import {
  pgSchema,
  pgTable,
  text,
  timestamp,
  time,
  integer,
} from "drizzle-orm/pg-core";
import { appSchema } from "./users";
import { genderEnum, levelEnum } from "./enums";
import { teams } from "./teams";

export const leagues = appSchema.table("leagues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  level: levelEnum("level").notNull(), // League level (2, 3, 4)
  gender: genderEnum("gender").notNull(), // League gender (male, female, mixed)
  start_date: timestamp("start_date"),
  end_date: timestamp("end_date"),
  created_by: text("created_by").notNull(), // Foreign key to users.id
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

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

// Re-export enums for convenience
export { genderEnum, levelEnum };

// Export types
export type League = typeof leagues.$inferSelect;
export type NewLeague = typeof leagues.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Gender = (typeof genderEnum.enumValues)[number];
export type Level = (typeof levelEnum.enumValues)[number];
