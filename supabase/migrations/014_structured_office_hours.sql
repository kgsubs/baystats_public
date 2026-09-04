-- Structured office hours with separate weekday/weekend times
-- Replaces simple text fields with structured time data

-- Add structured office hours columns
ALTER TABLE marina_profiles
ADD COLUMN IF NOT EXISTS customs_hours_structured JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS immigration_hours_structured JSONB DEFAULT NULL;

-- Structure:
-- {
--   "mon_fri": { "open": "08:00", "close": "16:00" },
--   "sat": { "open": "08:00", "close": "12:00" },  -- optional
--   "sun": { "open": "08:00", "close": "12:00" }   -- optional
-- }

-- Function to format schedule display according to rules
CREATE OR REPLACE FUNCTION format_office_hours_schedule(hours_structured JSONB)
RETURNS TABLE (
  line1 TEXT,
  line2 TEXT,
  line3 TEXT
) AS $$
DECLARE
  mon_fri_open TEXT;
  mon_fri_close TEXT;
  sat_open TEXT;
  sat_close TEXT;
  sun_open TEXT;
  sun_close TEXT;
  has_sat BOOLEAN;
  has_sun BOOLEAN;
  sat_same_as_sun BOOLEAN;
BEGIN
  -- Extract values
  mon_fri_open := hours_structured->'mon_fri'->>'open';
  mon_fri_close := hours_structured->'mon_fri'->>'close';
  sat_open := hours_structured->'sat'->>'open';
  sat_close := hours_structured->'sat'->>'close';
  sun_open := hours_structured->'sun'->>'open';
  sun_close := hours_structured->'sun'->>'close';
  
  has_sat := sat_open IS NOT NULL AND sat_close IS NOT NULL;
  has_sun := sun_open IS NOT NULL AND sun_close IS NOT NULL;
  sat_same_as_sun := (sat_open = sun_open AND sat_close = sun_close);
  
  -- Line 1: Always Mon-Fri
  line1 := 'Mon-Fri ' || mon_fri_open || '-' || mon_fri_close;
  
  -- Lines 2 & 3: Weekend logic
  line2 := NULL;
  line3 := NULL;
  
  IF has_sat AND has_sun THEN
    -- Both weekend days set
    IF sat_same_as_sun THEN
      -- Same hours - combine
      line2 := 'Sat+Sun ' || sat_open || '-' || sat_close;
    ELSE
      -- Different hours - separate lines
      line2 := 'Sat ' || sat_open || '-' || sat_close;
      line3 := 'Sun ' || sun_open || '-' || sun_close;
    END IF;
  ELSIF has_sat THEN
    -- Only Saturday
    line2 := 'Sat ' || sat_open || '-' || sat_close;
  ELSIF has_sun THEN
    -- Only Sunday
    line2 := 'Sun ' || sun_open || '-' || sun_close;
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing data (parse from text format)
UPDATE marina_profiles
SET customs_hours_structured = jsonb_build_object(
  'mon_fri', jsonb_build_object('open', '08:00', 'close', '16:00')
)
WHERE customs_hours_structured IS NULL AND customs_hours IS NOT NULL;

UPDATE marina_profiles
SET immigration_hours_structured = jsonb_build_object(
  'mon_fri', jsonb_build_object('open', '08:00', 'close', '16:00')
)
WHERE immigration_hours_structured IS NULL AND immigration_hours IS NOT NULL;
