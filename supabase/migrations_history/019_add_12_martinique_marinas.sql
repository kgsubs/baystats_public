-- Add 12 Martinique Marinas
-- Data source: https://ports.marinelink.com/ports?search=Martinique
-- Scraped and parsed: 2026-02-15

-- 1. SAINTE-ANNE
INSERT INTO marina_profiles (
  name, slug, location, address, phone, website, website_label,
  latitude, longitude,
  water_depth, total_berths, boat_size_capacity,
  fuel_dock, water_availability, power_connections, wifi,
  restrooms_showers, maintenance_repair, chandlery,
  amenities, additional_services,
  customs_hours_structured, immigration_hours_structured,
  clearance_notes, marinelink_url, status,
  created_at, updated_at
) VALUES (
  'Sainte-Anne Marina', 'sainte-anne', 'Sainte-Anne, Martinique',
  'Sainte-Anne Martinique 97227 Martinique', 'Contact marina', 'Not available', NULL,
  14.4331, -60.8877,
  '2.5 meters', NULL, 'Small to mid-sized vessels',
  'Diesel and petrol available', 'Freshwater at docks', '220V shore power', 'Available in certain areas',
  'Public restrooms and showers', 'Basic repair and maintenance', 'Not available',
  '["beach access", "restaurants", "bars", "cafes", "shopping", "local markets", "Les Salines Beach", "Pointe Marin Beach", "nature trails"]'::jsonb,
  '{"provisioning": "Nearby shops and markets", "waste_disposal": "Available", "atm_banking": "Available", "customs_onsite": "Customs processed in Fort-de-France"}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "16:00"}}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "16:00"}}'::jsonb,
  'Charming marina with access to famous beaches. Customs in Fort-de-France.',
  'https://ports.marinelink.com/ports/port/sainte-anne', 'approved', NOW(), NOW()
),

-- 2. POINTE DU BOUT
(
  'Pointe du Bout Marina', 'pointe-du-bout', 'Pointe du Bout, Martinique',
  'Les Trois-Îlets Martinique', 'Contact resort', 'Not available', NULL,
  14.5577, -61.0508,
  'Suitable for small to medium vessels', NULL, 'Small to medium yachts and pleasure boats',
  'Not specified', 'Not specified', 'Not specified', 'Not specified',
  'Not specified', 'Basic maintenance available', 'Not specified',
  '["beach access", "hotels", "restaurants", "shopping", "nightlife", "casinos", "golf courses"]'::jsonb,
  '{"ferry_terminal": "Ferry to Fort-de-France", "medical_facilities": "Basic services available", "customs_onsite": "Processed in Fort-de-France", "provisioning": "Multiple supermarkets nearby"}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "17:00"}}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "17:00"}}'::jsonb,
  'Tourist marina known for resorts and vibrant nightlife. Short ferry to Fort-de-France.',
  'https://ports.marinelink.com/ports/port/pointe-du-bout', 'approved', NOW(), NOW()
),

-- 3. ANSE À L'ÂNE
(
  'Anse à l''Âne Marina', 'anse-a-lane', 'Anse à l''Âne, Martinique',
  'Les Trois-Îlets Martinique', 'Contact marina', 'Not available', NULL,
  14.54275, -61.06742,
  '2 to 5 meters', NULL, 'Small and medium recreational vessels',
  'Available at nearby ports', 'Not specified', 'Not specified', 'Not specified',
  'Not specified', 'Not specified', 'Not specified',
  '["beach access", "hotels", "restaurants", "snorkeling", "water sports"]'::jsonb,
  '{"diving_services": "Scuba diving and snorkeling available"}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "16:00"}}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "16:00"}}'::jsonb,
  'Serene beach marina with calm waters. Popular for recreational activities.',
  'https://ports.marinelink.com/ports/port/anse-a-lane', 'approved', NOW(), NOW()
),

-- 4. ANSE DUFOUR
(
  'Anse Dufour Marina', 'anse-dufour', 'Anse Dufour, Martinique',
  'Les Anses-d''Arlet Martinique', 'Contact marina', 'Not available', NULL,
  14.5262, -61.0911,
  '3 to 10 meters', NULL, 'Small boats and yachts',
  'Not available', 'Not specified', 'Not specified', 'Not specified',
  'Basic restrooms and changing areas', 'Not specified', 'Not specified',
  '["black sand beach", "snorkeling", "diving", "sea turtles", "hiking trails", "restaurants", "cafes", "local villages"]'::jsonb,
  '{"diving_services": "Excellent snorkeling and diving with sea turtles", "waste_disposal": "Available", "atm_banking": "Available"}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "16:00"}}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "16:00"}}'::jsonb,
  'Picturesque cove with black sand beach. Famous for sea turtle sightings.',
  'https://ports.marinelink.com/ports/port/anse-dufour', 'approved', NOW(), NOW()
),

-- 5. ANSE MITAN
(
  'Anse Mitan Marina', 'anse-mitan', 'Anse Mitan, Martinique',
  'Les Trois-Îlets, Martinique', 'Contact marina', 'Not available', NULL,
  14.5541, -61.0583,
  'Suitable for yachts and pleasure boats', NULL, 'Various yacht sizes',
  'Fresh water and fuel available', 'Fresh water available', 'Not specified', 'Not specified',
  'Not specified', 'Limited repair services', 'Not specified',
  '["beach access", "hotels", "restaurants", "shopping", "museums", "La Savane des Esclaves", "Pagerie Museum"]'::jsonb,
  '{"ferry_terminal": "Regular ferry to Fort-de-France", "diving_services": "Available", "customs_onsite": "Available"}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "17:00"}}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "17:00"}}'::jsonb,
  'Marina with ferry access to Fort-de-France. Close to historical sites.',
  'https://ports.marinelink.com/ports/port/anse-mitan', 'approved', NOW(), NOW()
),

-- 6. ANSE NOIRE
(
  'Anse Noire Marina', 'anse-noire', 'Anse Noire, Martinique',
  'Les Anses-d''Arlet, Martinique', 'Contact marina', 'Not available', NULL,
  14.5281, -61.0884,
  'Shallow near shore, deep offshore', NULL, 'Dinghies and small boats',
  'Not available', 'Not specified', 'Not specified', 'Not specified',
  'Limited facilities', 'Not available', 'Not available',
  '["black sand beach", "snorkeling", "sea turtles", "secluded cove", "picnic tables"]'::jsonb,
  '{"diving_services": "Excellent snorkeling, frequent sea turtle sightings"}'::jsonb,
  NULL, NULL,
  'Secluded black sand beach. No formal services - recreational anchorage only.',
  'https://ports.marinelink.com/ports/port/anse-noire', 'approved', NOW(), NOW()
),

-- 7. MARINA DU ROBERT
(
  'Marina du Robert', 'marina-du-robert', 'Le Robert, Martinique',
  'Le Robert, Martinique', 'Contact marina authority', 'Not available', NULL,
  14.6542, -60.9272,
  'Varying depths for different vessels', NULL, 'Range of vessels from small boats to yachts',
  'Diesel and unleaded petrol on-site', 'Available at berths', 'European standard voltages', 'Available throughout marina',
  'Modern restrooms and showers', 'Engine maintenance, hull repairs available', 'On-site chandlery',
  '["restaurants", "cafes", "shopping", "islands access", "Îlet Chancel", "Îlet Madame", "natural reserves", "historical sites"]'::jsonb,
  '{"provisioning": "Local shops and markets nearby", "waste_disposal": "Bilge pump-out stations", "airport_shuttle": "Airport 20km away", "security": "24/7 surveillance"}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "17:00"}}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "17:00"}}'::jsonb,
  'Full-service marina on east coast. Access to nearby islands and natural reserves.',
  'https://ports.marinelink.com/ports/port/marina-du-robert', 'approved', NOW(), NOW()
),

-- 8. LES TROIS-ÎLETS
(
  'Marina Les Trois-Îlets', 'les-trois-ilets', 'Les Trois-Îlets, Martinique',
  'Les Trois-Îlets, Martinique', 'Contact marina', 'Not available', NULL,
  14.5459, -61.0326,
  'Suitable for various yacht sizes', 200, 'Various sizes up to large yachts',
  'On-site refueling for diesel and gasoline', 'Available at each berth', 'Available at berths', 'Available throughout marina',
  'Clean and well-maintained facilities', 'Engine repair, hull cleaning, painting', 'Well-stocked chandlery',
  '["restaurants", "cafes", "shopping", "beach access", "Anse Mitan", "Pointe du Bout", "museums", "La Savane des Esclaves", "Maison de la Canne", "golf", "water sports"]'::jsonb,
  '{"boat_yard": "Travel lifts and dry storage", "dry_storage": "Available", "laundry": "On-site", "provisioning": "Supermarket nearby", "car_rental": "Available", "ferry_terminal": "Ferry to Fort-de-France", "diving_services": "Available", "waste_disposal": "Sewage pump-out", "security": "24/7 with cameras"}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "18:00"}, "sat": {"open": "08:00", "close": "12:00"}}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "18:00"}, "sat": {"open": "08:00", "close": "12:00"}}'::jsonb,
  'Premier full-service marina with 200 berths. Complete facilities and cultural attractions.',
  'https://ports.marinelink.com/ports/port/les-trois-ilets', 'approved', NOW(), NOW()
),

-- 9. CASE PILOTE
(
  'Marina Case Pilote', 'case-pilote', 'Case-Pilote, Martinique',
  'Case-Pilote, Martinique', 'Check local listings', 'Not available', NULL,
  14.6413, -61.139,
  'Sufficient for yachts and pleasure craft', NULL, 'Small boats to yachts',
  'On-site fuel dock', 'Available at berths', 'Available at berths', 'Available for guests',
  'Clean and well-maintained', 'Basic maintenance services', 'Not specified',
  '["restaurants", "cafes", "shopping", "local markets", "historical sites", "cultural activities"]'::jsonb,
  '{"laundry": "Available", "provisioning": "Local grocery and markets", "atm_banking": "Available", "diving_services": "Available"}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "17:00"}}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "17:00"}}'::jsonb,
  'Tranquil marina 7km north of Fort-de-France. Less crowded, friendly atmosphere.',
  'https://ports.marinelink.com/ports/port/case-pilote', 'approved', NOW(), NOW()
),

-- 10. LA PRESQU'ÎLE
(
  'La Presqu''île Marina', 'la-presqulle', 'La Presqu''île, Martinique',
  'Martinique', 'Contact marina', 'Not available', NULL,
  14.6217, -60.8894,
  'Various depths', NULL, 'Range from small boats to larger yachts',
  'Gasoline and diesel on-site', 'Freshwater at docks', '16/32/63A outlets', 'Wi-Fi throughout',
  'Modern, clean facilities', 'Mechanical, electrical, hull repairs', 'Marine hardware available',
  '["restaurants", "bars", "cafes", "beach access", "water sports", "museums", "markets", "galleries", "diving", "excursions"]'::jsonb,
  '{"customs_onsite": "Assistance available", "provisioning": "Grocery store nearby", "laundry": "Available", "diving_services": "Equipment rental", "car_rental": "Accessible", "security": "24-hour surveillance"}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "18:00"}}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "18:00"}}'::jsonb,
  'Premier destination with strategic location. Full amenities and yacht club.',
  'https://ports.marinelink.com/ports/port/la-presqulle', 'approved', NOW(), NOW()
),

-- 11. LES ANSES-D'ARLET
(
  'Les Anses-d''Arlet Marina', 'les-anses-darlet', 'Les Anses-d''Arlet, Martinique',
  'Les Anses-d''Arlet, Martinique', 'Contact local authorities', 'Not available', NULL,
  14.5013, -61.0914,
  '2 to 4 meters', NULL, 'Small and mid-sized vessels',
  'Nearby but limited', 'Freshwater at berths', 'Electricity hookups', 'Not specified',
  'Available', 'Limited maintenance', 'Not available',
  '["beach access", "restaurants", "bars", "cafes", "snorkeling", "diving", "water sports"]'::jsonb,
  '{"boat_yard": "Limited services", "waste_disposal": "Available", "charter_services": "Boat tours, fishing charters", "diving_services": "Popular spot for snorkeling and diving"}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "16:00"}}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "16:00"}}'::jsonb,
  'Charming commune with rich marine life. Popular for diving and local culture.',
  'https://ports.marinelink.com/ports/port/les-anses-darlet', 'approved', NOW(), NOW()
),

-- 12. LE MARIN (Major Hub)
(
  'Le Marin Marina', 'le-marin', 'Le Marin, Martinique',
  'Le Marin Martinique', '+596 596 74 83 83', 'https://en.wikipedia.org/wiki/Le_Marin', 'wikipedia.org',
  14.4606, -60.875,
  '2.5 to 6 meters', 750, 'Various sizes accommodated',
  'Diesel and gasoline', 'Water supply at berths', 'Electricity available', 'Wi-Fi throughout',
  'Showers and facilities', 'Full marine services, shipyard', 'Multiple chandlers',
  '["restaurants", "bars", "hotels", "shopping", "markets", "maritime museum", "beaches", "Saint-Anne village", "natural sites"]'::jsonb,
  '{"boat_yard": "Full shipyard facilities", "haul_out": "Available", "laundry": "Available", "provisioning": "Multiple supermarkets", "waste_disposal": "Complete disposal services", "atm_banking": "Available", "charter_services": "Sailing, diving, water sports", "customs_onsite": "Clearance office available", "airport_shuttle": "32km to FDF airport", "diving_services": "Multiple operators", "security": "24/7 surveillance"}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "18:00"}, "sat": {"open": "08:00", "close": "12:00"}}'::jsonb,
  '{"mon_fri": {"open": "08:00", "close": "18:00"}, "sat": {"open": "08:00", "close": "12:00"}}'::jsonb,
  'Largest marina in Caribbean with 750 berths. Major yachting hub with complete facilities.',
  'https://ports.marinelink.com/ports/port/le-marin', 'approved', NOW(), NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  updated_at = NOW();

-- Update Le Marin VHF channel
UPDATE marina_profiles
SET vhf_channel = '9'
WHERE slug = 'le-marin';

-- Add initial vessel counts
INSERT INTO vessel_counts (location, count, recorded_at, time_of_day, reporter)
VALUES
  ('sainte-anne', 0, NOW(), 'morning', 'system'),
  ('pointe-du-bout', 0, NOW(), 'morning', 'system'),
  ('anse-a-lane', 0, NOW(), 'morning', 'system'),
  ('anse-dufour', 0, NOW(), 'morning', 'system'),
  ('anse-mitan', 0, NOW(), 'morning', 'system'),
  ('anse-noire', 0, NOW(), 'morning', 'system'),
  ('marina-du-robert', 0, NOW(), 'morning', 'system'),
  ('les-trois-ilets', 0, NOW(), 'morning', 'system'),
  ('case-pilote', 0, NOW(), 'morning', 'system'),
  ('la-presqulle', 0, NOW(), 'morning', 'system'),
  ('les-anses-darlet', 0, NOW(), 'morning', 'system'),
  ('le-marin', 0, NOW(), 'morning', 'system')
ON CONFLICT DO NOTHING;
