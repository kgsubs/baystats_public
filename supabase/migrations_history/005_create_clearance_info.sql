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
