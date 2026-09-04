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
