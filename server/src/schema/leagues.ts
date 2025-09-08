import {
  pgSchema,
  pgTable,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { appSchema } from "./users";

// Define gender enum
export const genderEnum = pgEnum("gender", ["male", "female", "mixed"]);

// Define level enum
export const levelEnum = pgEnum("level", ["1", "2", "3", "4"]);

export const leagues = appSchema.table("leagues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  created_by: text("created_by").notNull(), // Foreign key to users.id
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const groups = appSchema.table("groups", {
  id: text("id").primaryKey(),
  league_id: text("league_id").notNull(), // Foreign key to leagues.id
  name: text("name").notNull(),
  level: levelEnum("level").notNull(),
  gender: genderEnum("gender").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Export types
export type League = typeof leagues.$inferSelect;
export type NewLeague = typeof leagues.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type Gender = (typeof genderEnum.enumValues)[number];
export type Level = (typeof levelEnum.enumValues)[number];
