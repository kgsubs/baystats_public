-- Launch-notification signups captured from the coming-soon modal.
CREATE TABLE IF NOT EXISTS location_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  location_slug TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS location_waitlist_email_location_idx
  ON location_waitlist (lower(email), location_slug);

ALTER TABLE location_waitlist ENABLE ROW LEVEL SECURITY;
