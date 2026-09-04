CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  tier TEXT CHECK (tier IN ('free', 'pro')) DEFAULT 'free',
  stripe_customer_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON users
  FOR ALL
  USING (auth.uid() = id);
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_start TIMESTAMP NOT NULL,
  session_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_dates
  ON sessions(user_id, session_start, session_end);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_own_data ON sessions
  FOR SELECT
  USING (user_id = auth.uid());
CREATE TABLE IF NOT EXISTS weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL,
  cached_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_weather_expires
  ON weather_cache(expires_at);

ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY weather_public_read ON weather_cache
  FOR SELECT
  USING (true);
CREATE TABLE IF NOT EXISTS vessel_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count INTEGER NOT NULL,
  recorded_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vessel_recorded
  ON vessel_counts(recorded_at DESC);

ALTER TABLE vessel_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY vessels_public_read ON vessel_counts
  FOR SELECT
  USING (true);
CREATE TABLE IF NOT EXISTS clearance_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customs_hours TEXT NOT NULL,
  immigration_hours TEXT NOT NULL,
  fees JSONB NOT NULL,
  last_updated TIMESTAMP NOT NULL
);

ALTER TABLE clearance_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY clearance_public_read ON clearance_info
  FOR SELECT
  USING (true);

-- Seed initial clearance data
INSERT INTO clearance_info (customs_hours, immigration_hours, fees, last_updated)
VALUES (
  '08:00-16:00 AST',
  '08:00-16:00 AST',
  '{"entry_per_person": 15, "exit_per_person": 15, "overtime_penalty": 50}'::jsonb,
  NOW()
)
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

-- No RLS (access controlled at API layer)
