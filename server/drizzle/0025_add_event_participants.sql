-- Event participants: players added to the event (before being assigned to teams)
CREATE TABLE IF NOT EXISTS app.event_participants (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES app.events(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES app.users(id),
  created_at timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT event_participants_event_user_unique UNIQUE (event_id, user_id)
);
