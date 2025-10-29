-- Remove player level fields from users table
ALTER TABLE app.users DROP COLUMN IF EXISTS claimed_level;
ALTER TABLE app.users DROP COLUMN IF EXISTS level_validation_status;
ALTER TABLE app.users DROP COLUMN IF EXISTS level_validated_at;
ALTER TABLE app.users DROP COLUMN IF EXISTS level_validated_by;
ALTER TABLE app.users DROP COLUMN IF EXISTS level_validation_notes;

