-- Create team_leagues junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS app.team_leagues (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  league_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT team_leagues_team_league_unique UNIQUE (team_id, league_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_team_leagues_team_id ON app.team_leagues(team_id);
CREATE INDEX IF NOT EXISTS idx_team_leagues_league_id ON app.team_leagues(league_id);

-- Migrate existing data from teams.league_id to team_leagues
-- Only migrate teams that have a league_id set
INSERT INTO app.team_leagues (id, team_id, league_id, created_at)
SELECT 
  gen_random_uuid()::TEXT,
  t.id,
  t.league_id,
  COALESCE(t.created_at, NOW())
FROM app.teams t
WHERE t.league_id IS NOT NULL
ON CONFLICT (team_id, league_id) DO NOTHING;

