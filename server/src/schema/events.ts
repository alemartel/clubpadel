import {
  pgSchema,
  pgTable,
  text,
  timestamp,
  integer,
  unique,
} from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";
import { appSchema } from "./users.js";
import { users } from "./users.js";

export const eventTypeEnum = pgEnum("event_type", ["americano"]);

export const events = appSchema.table("events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tipo_evento: eventTypeEnum("tipo_evento").default("americano").notNull(),
  created_by: text("created_by")
    .notNull()
    .references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const event_teams = appSchema.table(
  "event_teams",
  {
    id: text("id").primaryKey(),
    event_id: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    eventNameUnique: unique("event_teams_event_name_unique").on(
      table.event_id,
      table.name
    ),
  })
);

export const event_team_members = appSchema.table(
  "event_team_members",
  {
    id: text("id").primaryKey(),
    event_team_id: text("event_team_id")
      .notNull()
      .references(() => event_teams.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    teamUserUnique: unique("event_team_members_team_user_unique").on(
      table.event_team_id,
      table.user_id
    ),
  })
);

export const event_matches = appSchema.table(
  "event_matches",
  {
    id: text("id").primaryKey(),
    event_id: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    round_number: integer("round_number").notNull(),
    home_team_id: text("home_team_id")
      .notNull()
      .references(() => event_teams.id, { onDelete: "cascade" }),
    away_team_id: text("away_team_id")
      .notNull()
      .references(() => event_teams.id, { onDelete: "cascade" }),
    resultado_local: integer("resultado_local"),
    resultado_visitante: integer("resultado_visitante"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    eventPairingUnique: unique("event_matches_event_pairing_unique").on(
      table.event_id,
      table.home_team_id,
      table.away_team_id
    ),
  })
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventTeam = typeof event_teams.$inferSelect;
export type NewEventTeam = typeof event_teams.$inferInsert;
export type EventTeamMember = typeof event_team_members.$inferSelect;
export type NewEventTeamMember = typeof event_team_members.$inferInsert;
export type EventMatch = typeof event_matches.$inferSelect;
export type NewEventMatch = typeof event_matches.$inferInsert;
