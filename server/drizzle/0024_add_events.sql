-- Migration: Add events schema for Americano (team round-robin) events
-- Tables: events, event_teams, event_team_members, event_matches

CREATE TYPE app.event_type AS ENUM ('americano');

CREATE TABLE IF NOT EXISTS app.events (
  id text PRIMARY KEY,
  name text NOT NULL,
  tipo_evento app.event_type NOT NULL DEFAULT 'americano',
  created_by text NOT NULL REFERENCES app.users(id),
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.event_teams (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES app.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT event_teams_event_name_unique UNIQUE (event_id, name)
);

CREATE TABLE IF NOT EXISTS app.event_team_members (
  id text PRIMARY KEY,
  event_team_id text NOT NULL REFERENCES app.event_teams(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES app.users(id),
  created_at timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT event_team_members_team_user_unique UNIQUE (event_team_id, user_id)
);

CREATE TABLE IF NOT EXISTS app.event_matches (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES app.events(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  home_team_id text NOT NULL REFERENCES app.event_teams(id) ON DELETE CASCADE,
  away_team_id text NOT NULL REFERENCES app.event_teams(id) ON DELETE CASCADE,
  resultado_local integer,
  resultado_visitante integer,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT event_matches_event_pairing_unique UNIQUE (event_id, home_team_id, away_team_id)
);
