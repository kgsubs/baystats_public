-- Add Fort-de-France Port (Martinique)
-- Data source: https://ports.marinelink.com/ports/port/fort-de-france
-- Note: This is a commercial port, not a yacht marina

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
  customs_hours_structured,
  immigration_hours_structured,
  clearance_notes,
  marinelink_url,
  status,
  created_at,
  updated_at
) VALUES (
  'Fort-de-France Port',
  'fort-de-france',
  'Fort-de-France, Martinique',
  'Fort-de-France, Martinique',
  'Contact via port authority',
  'https://www.port-martinique.com/',
  'port-martinique.com',
  14.5932,
  -61.0506,
  'Vessels up to 11m draft',
  NULL,  -- Commercial port - berth count not applicable for yachts
  'Anchorage available',
  'Not specified',
  'Up to 11 meters (36 feet)',
  'Bunkering services available',
  'Available',
  'Available at commercial berths',
  'Ship repairs available (limited)',
  'Chandleries available',
  'Not specified',
  '["pilotage 24/7", "tugboat assistance", "container terminal", "cargo storage", "passenger terminals", "waste reception", "ro-ro facilities", "airport nearby 10km"]'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "16:00"}}'::jsonb,  -- Typical port authority hours
  '{"mon_fri": {"open": "08:00", "close": "16:00"}}'::jsonb,
  'Commercial port - contact port authority for yacht clearance procedures. Pilotage compulsory 24/7. Airport 10km away.',
  'https://ports.marinelink.com/ports/port/fort-de-france',
  'approved',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  website = EXCLUDED.website,
  marinelink_url = EXCLUDED.marinelink_url,
  updated_at = NOW();

-- Add initial vessel count (placeholder - to be updated via admin)
INSERT INTO vessel_counts (
  location,
  count,
  recorded_at,
  time_of_day,
  reporter
) VALUES (
  'fort-de-france',
  0,
  NOW(),
  'morning',
  'system'
)
ON CONFLICT DO NOTHING;
