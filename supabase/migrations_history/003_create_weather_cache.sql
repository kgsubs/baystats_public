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
