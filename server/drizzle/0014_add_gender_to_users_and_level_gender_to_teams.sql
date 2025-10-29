-- Migration: Add gender to users and level/gender to teams
-- Also make league_id and group_id nullable in teams

-- Add gender column to users table (nullable)
ALTER TABLE app.users ADD COLUMN IF NOT EXISTS gender gender;

-- Make league_id nullable in teams table first (before adding new required fields)
ALTER TABLE app.teams ALTER COLUMN league_id DROP NOT NULL;

-- Make group_id nullable in teams table
ALTER TABLE app.teams ALTER COLUMN group_id DROP NOT NULL;

-- Add level column to teams table with default, then update from groups if available
ALTER TABLE app.teams ADD COLUMN IF NOT EXISTS level level;
UPDATE app.teams SET level = (SELECT g.level FROM app.groups g WHERE g.id = app.teams.group_id) WHERE level IS NULL AND group_id IS NOT NULL;
-- Set default for teams without groups
UPDATE app.teams SET level = '1' WHERE level IS NULL;
ALTER TABLE app.teams ALTER COLUMN level SET NOT NULL;

-- Add gender column to teams table with default, then update from groups if available
ALTER TABLE app.teams ADD COLUMN IF NOT EXISTS gender gender;
UPDATE app.teams SET gender = (SELECT g.gender FROM app.groups g WHERE g.id = app.teams.group_id) WHERE gender IS NULL AND group_id IS NOT NULL;
-- Set default for teams without groups
UPDATE app.teams SET gender = 'mixed' WHERE gender IS NULL;
ALTER TABLE app.teams ALTER COLUMN gender SET NOT NULL;

