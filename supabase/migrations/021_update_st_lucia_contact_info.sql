-- Update St Lucia marinas with complete contact information
-- Data source: Individual marina websites + MarineLink.com
-- Scraped: 2026-02-15

-- 1. RODNEY BAY MARINA
UPDATE marina_profiles
SET
  phone = '+1 758-458-7200',
  website = 'http://www.igy-rodneybay.com',
  website_label = 'igy-rodneybay.com',
  vhf_channel = '16',
  additional_services = jsonb_set(
    COALESCE(additional_services, '{}'::jsonb),
    '{email}',
    '"RBM@igymarinas.com"'
  ),
  updated_at = NOW()
WHERE slug = 'rodney-bay';

-- 2. MARIGOT BAY MARINA
UPDATE marina_profiles
SET
  phone = '+1 758-451-4275',
  website = 'https://marigotbayyachthaven.com',
  website_label = 'marigotbayyachthaven.com',
  vhf_channel = '12',
  additional_services = jsonb_set(
    jsonb_set(
      COALESCE(additional_services, '{}'::jsonb),
      '{email}',
      '"manager@marigotbaymarina.com"'
    ),
    '{dockmaster_email}',
    '"docks@marigotbaymarina.com"'
  ),
  updated_at = NOW()
WHERE slug = 'marigot-bay';

-- 3. SOUFRIÈRE (SMMA)
UPDATE marina_profiles
SET
  phone = '+1 758-459-5500',
  website = 'https://smmainc.com',
  website_label = 'smmainc.com',
  vhf_channel = '16',
  additional_services = jsonb_set(
    jsonb_set(
      COALESCE(additional_services, '{}'::jsonb),
      '{email}',
      '"[email protected]"'
    ),
    '{mobile}',
    '"+1 758-724-6331"'
  ),
  updated_at = NOW()
WHERE slug = 'soufriere';

-- 4. JALOUSIE / SUGAR BEACH
UPDATE marina_profiles
SET
  phone = '+1 758-456-8000',
  website = 'https://www.viceroyhotelsandresorts.com/sugar-beach',
  website_label = 'Sugar Beach Resort',
  additional_services = jsonb_set(
    COALESCE(additional_services, '{}'::jsonb),
    '{email}',
    '"reservations@viceroyhotelsandresorts.com"'
  ),
  updated_at = NOW()
WHERE slug = 'jalousie';

-- 5. CANARIES (NOTE: Fishing village with limited marina facilities)
-- No official marina contact - managed by SMMA
UPDATE marina_profiles
SET
  additional_services = jsonb_set(
    COALESCE(additional_services, '{}'::jsonb),
    '{contact_authority}',
    '"SMMA: +1 758-459-5500"'
  ),
  updated_at = NOW()
WHERE slug = 'canaries';
