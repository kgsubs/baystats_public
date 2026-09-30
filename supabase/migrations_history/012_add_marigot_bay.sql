-- Add Marigot Bay Marina profile
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
  'Marigot Bay Marina',
  'marigot-bay',
  'Marigot Bay',
  'Marigot Bay, St. Lucia',
  '+1-758-451-4974',
  'https://www.marigotbaymarina.com',
  'marigotbaymarina.com',
  13.9667,
  -61.0167,
  'yachts up to 140 feet',
  40,
  'Available',
  'Modern facilities with showers and restrooms',
  '15-25 feet',
  'Diesel and gasoline available dockside',
  'Potable water at all slips',
  '110/220V shore power',
  'Yard services available nearby',
  'Chandlery on site',
  'Free WiFi throughout marina',
  '["restaurants", "bars", "spa", "shopping", "swimming pool", "laundry", "24/7 security"]',
  'https://ports.marinelink.com/ports/port/marigot-bay',
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

-- Add clearance info for Marigot Bay
INSERT INTO clearance_info (
  customs_hours,
  immigration_hours,
  fees,
  marina,
  last_updated,
  notes
) VALUES (
  '08:00-16:00 AST',
  '08:00-16:00 AST',
  '{"entry_per_person": 15, "exit_per_person": 15, "overtime_penalty": 50}'::jsonb,
  '{"name": "Marigot Bay Marina", "address": "Marigot Bay, St. Lucia", "phone": "+1-758-451-4974", "website": "https://www.marigotbaymarina.com", "website_label": "marigotbaymarina.com", "source_url": "https://ports.marinelink.com/ports/port/marigot-bay", "source_name": "MarineLink.com"}'::jsonb,
  NOW(),
  'Clearance available at Rodney Bay for vessels requiring full customs/immigration'
)
ON CONFLICT DO NOTHING;
