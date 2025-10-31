-- Migration: Add passcode column to teams table
-- Applies to feature plan docs/features/0018_PLAN.md

-- Add passcode column (temporarily nullable for existing teams)
ALTER TABLE app.teams
  ADD COLUMN IF NOT EXISTS passcode text;

-- Generate unique passcodes for existing teams
DO $$
DECLARE
  team_record RECORD;
  new_passcode text;
  passcode_exists boolean;
  attempts int;
BEGIN
  FOR team_record IN SELECT id FROM app.teams WHERE passcode IS NULL LOOP
    attempts := 0;
    LOOP
      -- Generate 6-character alphanumeric passcode from character set
      new_passcode := '';
      FOR i IN 1..6 LOOP
        new_passcode := new_passcode || substr(
          'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
          floor(random() * 36)::int + 1,
          1
        );
      END LOOP;
      
      -- Check if passcode already exists
      SELECT EXISTS(SELECT 1 FROM app.teams WHERE passcode = new_passcode) INTO passcode_exists;
      
      EXIT WHEN NOT passcode_exists;
      
      -- Safety check to prevent infinite loops
      attempts := attempts + 1;
      IF attempts > 100 THEN
        RAISE EXCEPTION 'Failed to generate unique passcode after 100 attempts';
      END IF;
    END LOOP;
    
    UPDATE app.teams SET passcode = new_passcode WHERE id = team_record.id;
  END LOOP;
END $$;

-- Make passcode NOT NULL and add unique constraint
ALTER TABLE app.teams
  ALTER COLUMN passcode SET NOT NULL;

-- Add unique constraint on passcode
ALTER TABLE app.teams
  ADD CONSTRAINT teams_passcode_unique UNIQUE (passcode);

