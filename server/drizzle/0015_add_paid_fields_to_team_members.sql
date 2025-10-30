-- Migration: Add payment status fields to team_members
-- Applies to feature plan docs/features/0015_PLAN.md

ALTER TABLE app.team_members
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at timestamp,
  ADD COLUMN IF NOT EXISTS paid_amount numeric(10,2);
