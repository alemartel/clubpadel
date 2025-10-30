-- Drop 'role' column from app.team_members
ALTER TABLE app.team_members DROP COLUMN IF EXISTS role;
