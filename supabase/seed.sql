-- Seed data for a fresh install: the five marinas BayStats ships approved
-- by default, pulled from the public GET /api/admin-marinas endpoint on
-- the live deployment (no key required; it already serves this data to
-- anyone).
-- Idempotent: running this against a database that already has these rows
-- (matched by slug) changes nothing.
--
-- Internal-only columns (scraped_data, marinelink_raw_content,
-- manual_overrides, reviewed_by/reviewed_at) and vessel_counts are
-- intentionally not seeded here.

INSERT INTO public.marina_profiles (
  name, slug, location, country, address, phone, website, website_label, latitude, longitude, boat_size_capacity, total_berths, mooring_ball_availability, restrooms_showers, water_depth, fuel_dock, water_availability, power_connections, maintenance_repair, chandlery, wifi, amenities, marinelink_url, status, customs_hours, immigration_hours, clearance_notes, customs_hours_structured, immigration_hours_structured
) VALUES
  ('Marigot Bay Marina', 'marigot-bay', 'Marigot Bay', 'St. Lucia', 'Marigot Bay, St. Lucia', '+1 758-451-4275', 'https://marigotbayyachthaven.com/', 'marigotbayyachthaven.com', 13.9666, -61.0258, 'Yachts up to 280 feet', 42, 'Not specified', 'Modern facilities available through resort', '12 to 15 feet at entrance', 'Diesel and gasoline available', 'Freshwater at all berths', '110V, 220V, and 380V power supply', 'Partnering with local service providers for yacht maintenance and repair', 'Provisioning available through resort', 'Complimentary high-speed internet throughout marina', '["24/7 security", "gated access", "surveillance cameras", "customs and immigration", "concierge services", "pools", "fitness center", "multiple dining options", "spa", "boutiques", "event venues", "hurricane hole protection"]'::jsonb, 'https://ports.marinelink.com/ports/port/marigot-bay', 'approved', NULL, NULL, NULL, NULL, NULL),
  ('IGY Rodney Bay Marina', 'rodney-bay', 'Rodney Bay', 'Saint Lucia', 'Rodney Bay, Gros Islet, St. Lucia', '+1 758-458-7200', 'https://www.igymarinas.com/marinas/rodney-bay-marina/', 'igy-rodneybay.com', 14.0808, -60.9551, NULL, 253, NULL, 'Modern restrooms and shower facilities available', NULL, 'Dedicated fuel dock with gasoline and diesel', 'Potable water available at docks', '110/220V shore power connections', NULL, 'Well-stocked chandlery on site', 'Available within marina complex', '[]'::jsonb, NULL, 'approved', NULL, NULL, NULL, NULL, NULL),
  ('Canaries', 'canaries', 'Canaries', 'Saint Lucia', 'Canaries, St. Lucia', NULL, NULL, NULL, 13.9077, -61.0676, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, NULL, 'approved', NULL, NULL, NULL, NULL, NULL),
  ('Sugar Beach (Jalousie)', 'jalousie', 'Jalousie', 'Saint Lucia', 'Jalousie, St. Lucia', '+1 758-456-8000', 'https://www.viceroyhotelsandresorts.com/sugar-beach', 'viceroyhotelsandresorts.com', 13.8246, -61.0681, NULL, 8, NULL, 'Resort facilities available', NULL, NULL, 'Available', NULL, NULL, NULL, 'Available at resort', '[]'::jsonb, NULL, 'approved', NULL, NULL, NULL, NULL, NULL),
  ('Soufrière Marine Management Area', 'soufriere', 'Soufrière', 'Saint Lucia', 'Soufrière, St. Lucia', '+1 758-459-5500', 'https://smmainc.com/', 'smmainc.com', 13.8539, -61.0623, NULL, 60, NULL, 'Basic facilities', NULL, NULL, 'Available', NULL, NULL, NULL, NULL, '[]'::jsonb, NULL, 'approved', NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;
