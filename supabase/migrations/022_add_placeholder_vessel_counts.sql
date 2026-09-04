-- Add placeholder vessel counts for all marinas
-- Random berths filled between 5-10 for demo purposes

-- St Lucia Marinas
INSERT INTO vessel_counts (location, count, recorded_at, time_of_day, reporter, source)
VALUES
  ('rodney-bay', 7, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('marigot-bay', 6, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('soufriere', 5, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('jalousie', 8, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('canaries', 9, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY')
ON CONFLICT DO NOTHING;

-- Martinique Marinas
INSERT INTO vessel_counts (location, count, recorded_at, time_of_day, reporter, source)
VALUES
  ('fort-de-france', 10, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('sainte-anne', 7, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('pointe-du-bout', 6, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('anse-a-lane', 5, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('anse-dufour', 8, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('anse-mitan', 9, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('anse-noire', 5, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('marina-du-robert', 10, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('les-trois-ilets', 7, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('case-pilote', 6, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('la-presqulle', 8, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('les-anses-darlet', 5, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('le-marin', 9, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY')
ON CONFLICT DO NOTHING;

-- Grenada Marinas
INSERT INTO vessel_counts (location, count, recorded_at, time_of_day, reporter, source)
VALUES
  ('grenada-marine', 10, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('prickly-bay', 7, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('spice-island', 6, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('secret-harbour', 5, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('clarkes-court', 8, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('carriacou-marine', 9, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY'),
  ('port-louis', 10, NOW(), 'morning', 'System - Placeholder', 'MANUAL_ENTRY')
ON CONFLICT DO NOTHING;
