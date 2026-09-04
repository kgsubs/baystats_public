-- Add reserve_berth_url column to marina_profiles
ALTER TABLE marina_profiles ADD COLUMN IF NOT EXISTS reserve_berth_url TEXT;

-- Update Rodney Bay with the reserve berth URL
UPDATE marina_profiles 
SET reserve_berth_url = 'https://www.igymarinas.com/reserve-a-slip/?marina_id=1082'
WHERE slug = 'rodney-bay';
