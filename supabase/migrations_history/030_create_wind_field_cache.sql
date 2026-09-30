-- Server-side cache for the Open-Meteo wind field behind the Wind on the Water card.
-- One row per location; `payload` holds the last good response so the stale state
-- always has something to show.
CREATE TABLE IF NOT EXISTS wind_field_cache (
  location_slug TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wind_field_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY wind_field_cache_public_read ON wind_field_cache
  FOR SELECT
  USING (true);
