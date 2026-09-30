-- Add office hours columns to marina_profiles
-- Supports scraped data and manual overrides

-- Add customs and immigration hours columns
ALTER TABLE marina_profiles
ADD COLUMN IF NOT EXISTS customs_hours TEXT,
ADD COLUMN IF NOT EXISTS immigration_hours TEXT,
ADD COLUMN IF NOT EXISTS clearance_notes TEXT;

-- Add metadata for office hours tracking
ALTER TABLE marina_profiles
ADD COLUMN IF NOT EXISTS office_hours_scraped_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS office_hours_manual_at TIMESTAMP;

-- Create view that shows effective office hours (manual overrides take precedence)
CREATE OR REPLACE VIEW marina_office_hours AS
SELECT 
  id,
  name,
  slug,
  -- Effective customs hours: manual if set, else scraped
  CASE 
    WHEN manual_overrides->>'customs_hours' IS NOT NULL 
    THEN manual_overrides->>'customs_hours'
    ELSE customs_hours
  END as customs_hours,
  -- Effective immigration hours: manual if set, else scraped
  CASE 
    WHEN manual_overrides->>'immigration_hours' IS NOT NULL 
    THEN manual_overrides->>'immigration_hours'
    ELSE immigration_hours
  END as immigration_hours,
  -- Track if using manual override
  (manual_overrides->>'customs_hours') IS NOT NULL as customs_is_manual,
  (manual_overrides->>'immigration_hours') IS NOT NULL as immigration_is_manual,
  -- Source tracking
  CASE 
    WHEN manual_overrides->>'customs_hours' IS NOT NULL THEN 'manual'
    WHEN customs_hours IS NOT NULL THEN 'scraped'
    ELSE 'default'
  END as customs_source,
  CASE 
    WHEN manual_overrides->>'immigration_hours' IS NOT NULL THEN 'manual'
    WHEN immigration_hours IS NOT NULL THEN 'scraped'
    ELSE 'default'
  END as immigration_source,
  office_hours_scraped_at,
  office_hours_manual_at
FROM marina_profiles
WHERE status IN ('approved', 'manual_only');

-- Function to get clearance info for a marina with proper override handling
CREATE OR REPLACE FUNCTION get_marina_clearance_info(marina_slug TEXT)
RETURNS TABLE (
  customs_hours TEXT,
  immigration_hours TEXT,
  clearance_notes TEXT,
  customs_is_manual BOOLEAN,
  immigration_is_manual BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN mp.manual_overrides->>'customs_hours' IS NOT NULL 
      THEN mp.manual_overrides->>'customs_hours'
      ELSE mp.customs_hours
    END,
    CASE 
      WHEN mp.manual_overrides->>'immigration_hours' IS NOT NULL 
      THEN mp.manual_overrides->>'immigration_hours'
      ELSE mp.immigration_hours
    END,
    mp.clearance_notes,
    (mp.manual_overrides->>'customs_hours') IS NOT NULL,
    (mp.manual_overrides->>'immigration_hours') IS NOT NULL
  FROM marina_profiles mp
  WHERE mp.slug = marina_slug
  AND mp.status IN ('approved', 'manual_only');
END;
$$ LANGUAGE plpgsql;
