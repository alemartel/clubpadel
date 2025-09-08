import {
  pgSchema,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { userRoleEnum, levelValidationStatusEnum, levelEnum } from "./enums";

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
  role: userRoleEnum("role").default("player").notNull(),
  claimed_level: levelEnum("claimed_level"),
  level_validation_status: levelValidationStatusEnum("level_validation_status").default("none").notNull(),
  level_validated_at: timestamp("level_validated_at"),
  level_validated_by: text("level_validated_by"),
  level_validation_notes: text("level_validation_notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Re-export enums for convenience
export { userRoleEnum, levelValidationStatusEnum, levelEnum };

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type LevelValidationStatus = (typeof levelValidationStatusEnum.enumValues)[number];

// Add foreign key constraint for level_validated_by
// Note: This will be handled in the migration file
