-- Delete all marina records except St. Lucia marinas
-- This removes all Martinique and Grenada marinas from the database

DELETE FROM marina_profiles
WHERE country != 'Saint Lucia';

-- Also delete any vessel_counts for non-St. Lucia locations
DELETE FROM vessel_counts
WHERE location NOT IN ('rodney-bay', 'marigot-bay', 'soufriere', 'jalousie', 'canaries');
