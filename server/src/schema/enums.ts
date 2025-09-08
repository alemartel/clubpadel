import { pgEnum } from "drizzle-orm/pg-core";

// Define user role enum
export const userRoleEnum = pgEnum("user_role", ["admin", "player"]);

// Define level validation status enum
export const levelValidationStatusEnum = pgEnum("level_validation_status", ["none", "pending", "approved", "rejected"]);

// Define gender enum
export const genderEnum = pgEnum("gender", ["male", "female", "mixed"]);

// Define level enum
export const levelEnum = pgEnum("level", ["1", "2", "3", "4"]);
