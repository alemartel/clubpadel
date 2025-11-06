-- Migration: Add league_payments table for per-league payment tracking
-- Changes payment system from per-team to per-league

-- Create league_payments table
CREATE TABLE IF NOT EXISTS app.league_payments (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  team_id text NOT NULL,
  league_id text NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamp,
  paid_amount numeric(10,2),
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT league_payments_user_team_league_unique UNIQUE (user_id, team_id, league_id)
);

-- Migrate existing payment data from team_members to league_payments
-- For each team member with payment info, create league_payment entries for all leagues the team is in
INSERT INTO app.league_payments (id, user_id, team_id, league_id, paid, paid_at, paid_amount, created_at, updated_at)
SELECT 
  gen_random_uuid()::text as id,
  tm.user_id,
  tm.team_id,
  tl.league_id,
  tm.paid,
  tm.paid_at,
  tm.paid_amount,
  tm.joined_at as created_at,
  NOW() as updated_at
FROM app.team_members tm
INNER JOIN app.team_leagues tl ON tm.team_id = tl.team_id
WHERE tm.paid = true
ON CONFLICT (user_id, team_id, league_id) DO NOTHING;

