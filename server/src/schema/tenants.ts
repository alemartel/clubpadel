import { pgSchema, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const appSchema = pgSchema("app");

export const tenants = appSchema.table("tenants", {
  id: text("id").primaryKey(),
  host: text("host").notNull().unique(),
  name: text("name").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
