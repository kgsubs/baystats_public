-- Add slips and moorings columns to marina_profiles
ALTER TABLE marina_profiles
ADD COLUMN IF NOT EXISTS total_slips INTEGER,
ADD COLUMN IF NOT EXISTS total_moorings INTEGER;

-- Update with data from marinas.com for existing marinas
UPDATE marina_profiles
SET total_slips = 253, total_moorings = 20
WHERE location = 'rodney-bay';

UPDATE marina_profiles
SET total_slips = 42, total_moorings = 20
WHERE location = 'marigot-bay';

-- Soufriere, Jalousie, and Canaries are anchorages/harbors, not full marinas
-- Leave their slips/moorings as NULL for now
