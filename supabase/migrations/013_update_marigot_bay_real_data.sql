-- Update Marigot Bay with real data from MarineLink.com
UPDATE marina_profiles 
SET 
  name = 'Marigot Bay Marina (Marina Village)',
  location = 'Marigot Bay',
  address = 'Marigot Bay, St. Lucia',
  phone = '+1-758-451-4974',
  website = 'https://www.marigotbayresort.com/marina',
  website_label = 'marigotbayresort.com/marina',
  latitude = 13.9666,
  longitude = -61.0258,
  boat_size_capacity = 'Yachts up to 280 feet',
  total_berths = 40,
  mooring_ball_availability = 'Not specified',
  restrooms_showers = 'Modern facilities available through resort',
  water_depth = '12 to 15 feet at entrance',
  fuel_dock = 'Diesel and gasoline available',
  water_availability = 'Freshwater at all berths',
  power_connections = '110V, 220V, and 380V power supply',
  maintenance_repair = 'Partnering with local service providers for yacht maintenance and repair',
  chandlery = 'Provisioning available through resort',
  wifi = 'Complimentary high-speed internet throughout marina',
  amenities = '["24/7 security", "gated access", "surveillance cameras", "customs and immigration", "concierge services", "pools", "fitness center", "multiple dining options", "spa", "boutiques", "event venues", "hurricane hole protection"]',
  marinelink_url = 'https://ports.marinelink.com/ports/port/marigot-bay',
  updated_at = NOW()
WHERE slug = 'marigot-bay';

-- Also update Rodney Bay reserve URL if not set
UPDATE marina_profiles 
SET reserve_berth_url = 'https://www.igy-marinas.com/marina/rodney-bay-marina/'
WHERE slug = 'rodney-bay' AND (reserve_berth_url IS NULL OR reserve_berth_url = '');
