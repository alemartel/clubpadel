-- Migration: Remove payment fields from team_members table
-- Payment tracking has been moved to league_payments table

-- Remove payment-related columns from team_members
ALTER TABLE app.team_members
  DROP COLUMN IF EXISTS paid,
  DROP COLUMN IF EXISTS paid_at,
  DROP COLUMN IF EXISTS paid_amount;

