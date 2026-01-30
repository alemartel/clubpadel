-- Add start_date and description to app.events (idempotent)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'app' AND table_name = 'events' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE app.events ADD COLUMN start_date date NOT NULL DEFAULT CURRENT_DATE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'app' AND table_name = 'events' AND column_name = 'description'
  ) THEN
    ALTER TABLE app.events ADD COLUMN description text;
  END IF;
END $$;
