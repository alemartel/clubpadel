import {
  pgSchema,
  pgTable,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

// Create private schema for application tables
export const appSchema = pgSchema("app");

// Define user role enum
export const userRoleEnum = pgEnum("user_role", ["admin", "player"]);

export const users = appSchema.table("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  display_name: text("display_name"),
  photo_url: text("photo_url"),
  first_name: text("first_name"),
  last_name: text("last_name"),
  phone_number: text("phone_number"),
  role: userRoleEnum("role").default("player").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
