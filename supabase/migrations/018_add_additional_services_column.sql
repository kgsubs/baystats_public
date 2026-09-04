-- Add additional_services column for new service categories
-- This allows flexible addition of new services without schema changes

ALTER TABLE marina_profiles
ADD COLUMN IF NOT EXISTS additional_services JSONB DEFAULT '{}'::jsonb;

-- Also add VHF channel as it's important for marine communication
ALTER TABLE marina_profiles
ADD COLUMN IF NOT EXISTS vhf_channel TEXT DEFAULT NULL;

COMMENT ON COLUMN marina_profiles.additional_services IS
'Flexible storage for additional marina services such as: ferry_terminal, diving_services, boat_yard, dry_storage, haul_out_facilities, laundry, provisioning, customs_onsite, waste_disposal, atm_banking, medical_facilities, car_rental, airport_shuttle, charter_services. Only non-null/non-empty values should be displayed on frontend.';

COMMENT ON COLUMN marina_profiles.vhf_channel IS
'VHF radio channel for marina communication (e.g., "9", "16", "Ch 9")';
