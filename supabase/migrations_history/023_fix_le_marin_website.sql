-- Fix Le Marin website URL from Wikipedia to official marina website
-- Official site: Marina du Marin - Largest nautical base in West Indies

UPDATE marina_profiles
SET
  website = 'https://www.marin.marina-martinique.fr/en/',
  website_label = 'marina-martinique.fr',
  updated_at = NOW()
WHERE slug = 'le-marin';
