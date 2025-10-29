import { pgEnum } from "drizzle-orm/pg-core";

// Define user role enum
export const userRoleEnum = pgEnum("user_role", ["admin", "player"]);

// Define gender enum
export const genderEnum = pgEnum("gender", ["male", "female", "mixed"]);

// Define level enum
export const levelEnum = pgEnum("level", ["1", "2", "3", "4"]);
