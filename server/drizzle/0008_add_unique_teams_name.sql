-- Enforce global uniqueness on team names
ALTER TABLE app.teams ADD CONSTRAINT teams_name_unique UNIQUE (name);
