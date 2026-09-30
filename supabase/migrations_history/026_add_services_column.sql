-- Add services column to marina_profiles for structured service data
ALTER TABLE marina_profiles
ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN marina_profiles.services IS
'Structured service data with enabled/disabled state. Format: [{"id": "power_110v", "name": "110V", "emoji": "⚡", "category": "power", "enabled": true}, ...]';
