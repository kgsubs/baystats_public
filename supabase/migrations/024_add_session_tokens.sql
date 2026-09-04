ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS access_token uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS refresh_token uuid UNIQUE;

CREATE INDEX IF NOT EXISTS idx_sessions_access_token ON sessions(access_token);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
