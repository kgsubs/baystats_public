-- Remove restrooms service from all marina_profiles
UPDATE marina_profiles
SET services = (
  SELECT jsonb_agg(service)
  FROM jsonb_array_elements(services) AS service
  WHERE service->>'id' != 'restrooms'
)
WHERE services IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(services) AS service
    WHERE service->>'id' = 'restrooms'
  );
