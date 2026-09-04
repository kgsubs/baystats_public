-- Marina Profiles Table - Stores detailed marina information
-- Supports data scraped from marinelink.com and manual overrides

CREATE TABLE IF NOT EXISTS marina_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- url-friendly identifier (e.g., "rodney-bay", "marigot-bay")
  location TEXT NOT NULL, -- City/Region
  country TEXT NOT NULL DEFAULT 'St. Lucia',
  address TEXT,
  phone TEXT,
  website TEXT,
  website_label TEXT,
  
  -- Geolocation
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Scraped Data Fields (from marinelink.com)
  boat_size_capacity TEXT, -- e.g., "small sailboats to large yachts"
  total_berths INTEGER,
  mooring_ball_availability TEXT,
  restrooms_showers TEXT,
  water_depth TEXT, -- e.g., "4.5 meters (15 feet)"
  fuel_dock TEXT,
  water_availability TEXT,
  power_connections TEXT, -- e.g., "110/220V"
  maintenance_repair TEXT,
  chandlery TEXT,
  wifi TEXT,
  
  -- Additional Amenities (JSONB for flexibility)
  amenities JSONB DEFAULT '[]'::jsonb,
  -- e.g., ["laundry", "restaurants", "bars", "shopping", "24/7 security"]
  
  -- Source Tracking
  marinelink_url TEXT,
  marinelink_raw_content TEXT, -- Full scraped content for reference
  last_scraped_at TIMESTAMP,
  
  -- Review Workflow
  status TEXT NOT NULL DEFAULT 'pending_review', -- pending_review, approved, rejected, manual_only
  scraped_data JSONB, -- Original parsed data before any edits
  manual_overrides JSONB DEFAULT '{}'::jsonb, -- Fields manually edited
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE marina_profiles ENABLE ROW LEVEL SECURITY;

-- Public can read approved marinas
CREATE POLICY marina_profiles_public_read ON marina_profiles
  FOR SELECT
  USING (status = 'approved' OR status = 'manual_only');

-- Admin can do everything
CREATE POLICY marina_profiles_admin_all ON marina_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Create index on slug for lookups
CREATE INDEX idx_marina_profiles_slug ON marina_profiles(slug);
CREATE INDEX idx_marina_profiles_status ON marina_profiles(status);
CREATE INDEX idx_marina_profiles_location ON marina_profiles(location);

-- Seed initial Rodney Bay data from MarineLink.com
INSERT INTO marina_profiles (
  name,
  slug,
  location,
  address,
  phone,
  website,
  website_label,
  latitude,
  longitude,
  boat_size_capacity,
  total_berths,
  mooring_ball_availability,
  restrooms_showers,
  water_depth,
  fuel_dock,
  water_availability,
  power_connections,
  maintenance_repair,
  chandlery,
  wifi,
  amenities,
  marinelink_url,
  status,
  created_at,
  updated_at
) VALUES (
  'IGY Rodney Bay Marina',
  'rodney-bay',
  'Rodney Bay',
  'Rodney Bay, Gros Islet, St. Lucia',
  '+1-758-452-0324',
  'http://www.igy-rodneybay.com',
  'igy-rodneybay.com',
  14.0808,
  -60.9551,
  'small sailboats to large yachts',
  253,
  'Not specified',
  'Modern restrooms and shower facilities available',
  '4.5 meters (15 feet) average at entrance, deeper pockets available',
  'Dedicated fuel dock with gasoline and diesel',
  'Potable water available at docks',
  '110/220V shore power connections',
  'Comprehensive marine repair including hull, engine, electrical, diving services',
  'Well-stocked chandlery on site',
  'Available within marina complex',
  '["laundry", "restaurants", "bars", "shopping", "24/7 security", "surveillance cameras", "gated access", "customs and immigration office"]',
  'https://ports.marinelink.com/ports/port/rodney-bay',
  'approved',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website,
  updated_at = NOW();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marina_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_marina_profiles_timestamp ON marina_profiles;
CREATE TRIGGER update_marina_profiles_timestamp
  BEFORE UPDATE ON marina_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_marina_profiles_updated_at();
