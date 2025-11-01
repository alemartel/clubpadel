-- Migration: Add team_change_notifications table
-- Applies to feature plan docs/features/0019_PLAN.md

-- Create team_change_notifications table
CREATE TABLE IF NOT EXISTS app.team_change_notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  team_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('joined', 'removed')),
  created_at timestamp NOT NULL DEFAULT now(),
  read boolean NOT NULL DEFAULT false,
  read_at timestamp
);

-- Add foreign key constraints (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_change_notifications_user_id_fkey'
  ) THEN
    ALTER TABLE app.team_change_notifications
      ADD CONSTRAINT team_change_notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES app.users(id)
      ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_change_notifications_team_id_fkey'
  ) THEN
    ALTER TABLE app.team_change_notifications
      ADD CONSTRAINT team_change_notifications_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES app.teams(id)
      ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

-- Add indexes for efficient filtering and ordering
CREATE INDEX IF NOT EXISTS team_change_notifications_read_idx ON app.team_change_notifications(read);
CREATE INDEX IF NOT EXISTS team_change_notifications_created_at_idx ON app.team_change_notifications(created_at DESC);

