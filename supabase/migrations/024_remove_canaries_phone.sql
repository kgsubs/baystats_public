-- Remove phone number for Canaries marina
-- Set phone to NULL to hide phone row on dashboard

UPDATE marina_profiles
SET phone = NULL,
    updated_at = NOW()
WHERE slug = 'canaries';
