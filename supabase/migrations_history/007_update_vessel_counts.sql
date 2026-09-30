-- Migration 007: Update vessel_counts table for manual entry
-- Adds fields for VA/marina staff vessel count reporting

-- Add new columns for manual entry tracking
ALTER TABLE vessel_counts 
ADD COLUMN IF NOT EXISTS time_of_day TEXT CHECK (time_of_day IN ('morning', 'evening')),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS reporter TEXT NOT NULL DEFAULT 'System',
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'MANUAL_ENTRY',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Drop existing policy if exists and recreate
DROP POLICY IF EXISTS vessels_allow_insert ON vessel_counts;

-- Update RLS policy to allow inserts for authenticated and anon users
-- (VA simplicity - anyone with the link can report)
CREATE POLICY vessels_allow_insert ON vessel_counts
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Add index for time_of_day queries
CREATE INDEX IF NOT EXISTS idx_vessel_time_of_day
  ON vessel_counts(time_of_day);

-- Add index for reporter queries
CREATE INDEX IF NOT EXISTS idx_vessel_reporter
  ON vessel_counts(reporter);
