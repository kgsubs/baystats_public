-- Add location column to vessel_counts table
ALTER TABLE vessel_counts ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'rodney-bay';

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_vessel_counts_location ON vessel_counts(location);

-- Update existing records to have 'rodney-bay' as location
UPDATE vessel_counts SET location = 'rodney-bay' WHERE location IS NULL;
