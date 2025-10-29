import {
  pgSchema,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { userRoleEnum, levelEnum } from "./enums";

// Create private schema for application tables
export const appSchema = pgSchema("app");

export const users = appSchema.table("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  display_name: text("display_name"),
  photo_url: text("photo_url"),
  first_name: text("first_name"),
  last_name: text("last_name"),
  phone_number: text("phone_number"),
  dni: text("dni"),
  tshirt_size: text("tshirt_size"),
  role: userRoleEnum("role").default("player").notNull(),
  profile_picture_url: text("profile_picture_url"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Re-export enums for convenience
export { userRoleEnum, levelEnum };

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
