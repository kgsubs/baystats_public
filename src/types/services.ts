// Service configuration for marinas
export interface Service {
  id: string;
  name: string;
  emoji: string;
  enabled: boolean;
  category?: 'power' | 'basic' | 'amenity';
}

// Predefined power voltages
export interface PowerConfig {
  v110: boolean;
  v220: boolean;
  v240: boolean;
}

// Default services list - can be customized per marina
export const DEFAULT_SERVICES: Omit<Service, 'enabled'>[] = [
  // Power options
  { id: 'power_110v', name: '110V', emoji: '⚡', category: 'power' },
  { id: 'power_220v', name: '220V', emoji: '⚡', category: 'power' },
  { id: 'power_240v', name: '240V', emoji: '⚡', category: 'power' },

  // Basic services
  { id: 'fuel', name: 'Fuel Dock', emoji: '⛽', category: 'basic' },
  { id: 'water', name: 'Water', emoji: '💧', category: 'basic' },
  { id: 'wifi', name: 'WiFi', emoji: '📶', category: 'basic' },
  { id: 'showers', name: 'Showers', emoji: '🚿', category: 'basic' },
  { id: 'laundry', name: 'Laundry', emoji: '🧺', category: 'amenity' },
  { id: 'chandlery', name: 'Chandlery', emoji: '🛠️', category: 'basic' },
  { id: 'mooring', name: 'Mooring Balls', emoji: '⚓', category: 'basic' },
  { id: 'provisioning', name: 'Provisions', emoji: '🛒', category: 'amenity' },
  { id: 'restaurant', name: 'Restaurant', emoji: '🍽️', category: 'amenity' },
  { id: 'bar', name: 'Bar', emoji: '🍺', category: 'amenity' },
  { id: 'pool', name: 'Pool', emoji: '🏊', category: 'amenity' },
  { id: 'gym', name: 'Gym', emoji: '💪', category: 'amenity' },
  { id: 'spa', name: 'Spa', emoji: '💆', category: 'amenity' },
  { id: 'dive_shop', name: 'Dive Shop', emoji: '🤿', category: 'amenity' },
  { id: 'boat_rental', name: 'Boat Rental', emoji: '⛵', category: 'amenity' },
  { id: 'repairs', name: 'Repairs', emoji: '🔧', category: 'basic' },
  { id: 'parking', name: 'Parking', emoji: '🅿️', category: 'amenity' },
];

// Helper to get power display string
export function getPowerDisplay(services: Service[]): string {
  const enabledPower = services
    .filter(s => s.category === 'power' && s.enabled)
    .map(s => s.name);

  if (enabledPower.length === 0) return '';
  return enabledPower.join('/');
}
