/**
 * CENTRALIZED LOCATION REGISTRY
 * Single source of truth for all marina locations in BayStats
 *
 * To add a new marina:
 * 1. Add entry to LOCATIONS array below
 * 2. Run database migration to add marina_profiles record
 * 3. Add vessel count data via admin panel
 * 4. Everything else updates automatically
 */

export interface LocationConfig {
  // Identification
  slug: string;              // URL-safe identifier (e.g., 'rodney-bay')
  name: string;              // Display name (e.g., 'Rodney Bay')
  displayName: string;       // Full display name (e.g., 'Rodney Bay, St. Lucia')

  // Geographic data
  coordinates: {
    lat: number;             // Latitude for weather/sun/moon APIs
    lon: number;             // Longitude for weather/sun/moon APIs
  };

  // Tide parameters (for calculated tide data)
  tideParams: {
    meanLevel: number;       // Mean tide level in feet
    amplitude: number;       // Tide amplitude in feet
  };

  // Current parameters (for calculated current data)
  currentParams: {
    meanSpeed: number;       // Mean current speed in knots
    amplitude: number;       // Current amplitude in knots
  };

  // Regional grouping
  region: string;            // e.g., 'St. Lucia', 'Caribbean'
  country: string;           // e.g., 'Saint Lucia'
  timezone: string;          // IANA timezone (e.g., 'America/St_Lucia')
}

/**
 * ALL LOCATIONS - Add new marinas here
 */
export const LOCATIONS: LocationConfig[] = [
  // --- ST. LUCIA ---
  {
    slug: 'castries',
    name: 'Castries',
    displayName: 'Castries, St. Lucia',
    coordinates: { lat: 14.0142, lon: -61.0025 },
    tideParams: { meanLevel: 1.7, amplitude: 1.35 },
    currentParams: { meanSpeed: 1.1, amplitude: 1.0 },
    region: 'St. Lucia',
    country: 'Saint Lucia',
    timezone: 'America/St_Lucia',
  },
  // --- GRENADA ---
  {
    slug: 'clarkes-court-bay',
    name: 'Clarkes Court Bay',
    displayName: 'Clarkes Court Bay, Grenada',
    coordinates: { lat: 12.0106, lon: -61.7387 },
    tideParams: { meanLevel: 1.5, amplitude: 1.1 },
    currentParams: { meanSpeed: 0.75, amplitude: 0.7 },
    region: 'Grenada',
    country: 'Grenada',
    timezone: 'America/Grenada',
  },
  {
    slug: 'grenada-marine',
    name: 'Grenada Marine',
    displayName: 'Grenada Marine, Grenada',
    coordinates: { lat: 12.0209, lon: -61.6794 },
    tideParams: { meanLevel: 1.5, amplitude: 1.1 },
    currentParams: { meanSpeed: 0.8, amplitude: 0.7 },
    region: 'Grenada',
    country: 'Grenada',
    timezone: 'America/Grenada',
  },
  {
    slug: 'le-marin',
    name: 'Le Marin',
    displayName: 'Le Marin, Martinique',
    coordinates: { lat: 14.4719, lon: -60.8736 },
    tideParams: { meanLevel: 1.6, amplitude: 1.3 },
    currentParams: { meanSpeed: 1.1, amplitude: 1.0 },
    region: 'Martinique',
    country: 'Martinique',
    timezone: 'America/Martinique',
  },
  {
    slug: 'les-trois-ilets',
    name: 'Les Trois-Îlets',
    displayName: 'Les Trois-Îlets, Martinique',
    coordinates: { lat: 14.5459, lon: -61.0326 },
    tideParams: { meanLevel: 1.65, amplitude: 1.3 },
    currentParams: { meanSpeed: 1.0, amplitude: 0.9 },
    region: 'Martinique',
    country: 'Martinique',
    timezone: 'America/Martinique',
  },
  // --- ST. LUCIA ---
  {
    slug: 'marigot-bay',
    name: 'Marigot Bay',
    displayName: 'Marigot Bay, St. Lucia',
    coordinates: { lat: 13.9666, lon: -61.0258 },
    tideParams: { meanLevel: 1.7, amplitude: 1.2 },
    currentParams: { meanSpeed: 0.8, amplitude: 0.8 },
    region: 'St. Lucia',
    country: 'Saint Lucia',
    timezone: 'America/St_Lucia',
  },
  // --- MARTINIQUE ---
  {
    slug: 'marina-du-robert',
    name: 'Marina du Robert',
    displayName: 'Marina du Robert, Martinique',
    coordinates: { lat: 14.6542, lon: -60.9272 },
    tideParams: { meanLevel: 1.55, amplitude: 1.2 },
    currentParams: { meanSpeed: 0.85, amplitude: 0.8 },
    region: 'Martinique',
    country: 'Martinique',
    timezone: 'America/Martinique',
  },
  {
    slug: 'pointe-du-bout',
    name: 'Pointe du Bout',
    displayName: 'Pointe du Bout, Martinique',
    coordinates: { lat: 14.5577, lon: -61.0508 },
    tideParams: { meanLevel: 1.65, amplitude: 1.3 },
    currentParams: { meanSpeed: 1.0, amplitude: 0.9 },
    region: 'Martinique',
    country: 'Martinique',
    timezone: 'America/Martinique',
  },
  // --- GRENADA ---
  {
    slug: 'prickly-bay',
    name: 'Prickly Bay',
    displayName: 'Prickly Bay, Grenada',
    coordinates: { lat: 12.0010, lon: -61.7430 },
    tideParams: { meanLevel: 1.5, amplitude: 1.1 },
    currentParams: { meanSpeed: 0.75, amplitude: 0.7 },
    region: 'Grenada',
    country: 'Grenada',
    timezone: 'America/Grenada',
  },
  // --- ST. LUCIA ---
  {
    slug: 'rodney-bay',
    name: 'Rodney Bay',
    displayName: 'Rodney Bay, St. Lucia',
    coordinates: { lat: 14.0833, lon: -60.9667 },
    tideParams: { meanLevel: 1.75, amplitude: 1.45 },
    currentParams: { meanSpeed: 1.25, amplitude: 1.25 },
    region: 'St. Lucia',
    country: 'Saint Lucia',
    timezone: 'America/St_Lucia',
  },
  // --- MARTINIQUE ---
  {
    slug: 'sainte-anne',
    name: 'Sainte-Anne',
    displayName: 'Sainte-Anne, Martinique',
    coordinates: { lat: 14.4331, lon: -60.8877 },
    tideParams: { meanLevel: 1.6, amplitude: 1.3 },
    currentParams: { meanSpeed: 1.0, amplitude: 0.9 },
    region: 'Martinique',
    country: 'Martinique',
    timezone: 'America/Martinique',
  },
  // --- GRENADA ---
  {
    slug: 'secret-harbour',
    name: 'Secret Harbour',
    displayName: 'Secret Harbour, Grenada',
    coordinates: { lat: 12.0044, lon: -61.7523 },
    tideParams: { meanLevel: 1.5, amplitude: 1.1 },
    currentParams: { meanSpeed: 0.75, amplitude: 0.65 },
    region: 'Grenada',
    country: 'Grenada',
    timezone: 'America/Grenada',
  },
  // --- ST. LUCIA ---
  {
    slug: 'soufriere',
    name: 'Soufrière',
    displayName: 'Soufrière, St. Lucia',
    coordinates: { lat: 13.8539, lon: -61.0623 },
    tideParams: { meanLevel: 1.65, amplitude: 1.2 },
    currentParams: { meanSpeed: 0.8, amplitude: 0.75 },
    region: 'St. Lucia',
    country: 'Saint Lucia',
    timezone: 'America/St_Lucia',
  },
  // --- GRENADA ---
  {
    slug: 'spice-island-marina',
    name: 'Spice Island Marina',
    displayName: 'Spice Island Marina, Grenada',
    coordinates: { lat: 12.0056, lon: -61.7643 },
    tideParams: { meanLevel: 1.5, amplitude: 1.1 },
    currentParams: { meanSpeed: 0.75, amplitude: 0.65 },
    region: 'Grenada',
    country: 'Grenada',
    timezone: 'America/Grenada',
  },
  {
    slug: 'st-georges',
    name: "St. George's",
    displayName: "St. George's, Grenada",
    coordinates: { lat: 12.0480, lon: -61.7515 },
    tideParams: { meanLevel: 1.6, amplitude: 1.2 },
    currentParams: { meanSpeed: 1.0, amplitude: 0.9 },
    region: 'Grenada',
    country: 'Grenada',
    timezone: 'America/Grenada',
  },
  // --- ST. LUCIA ---
  {
    slug: 'vieux-fort',
    name: 'Vieux Fort',
    displayName: 'Vieux Fort, St. Lucia',
    coordinates: { lat: 13.7205, lon: -60.9565 },
    tideParams: { meanLevel: 1.6, amplitude: 1.3 },
    currentParams: { meanSpeed: 1.1, amplitude: 1.0 },
    region: 'St. Lucia',
    country: 'Saint Lucia',
    timezone: 'America/St_Lucia',
  },
];

/**
 * LOOKUP FUNCTIONS - Do not modify
 */

// Get location config by slug
export function getLocation(slug: string): LocationConfig | null {
  return LOCATIONS.find(loc => loc.slug === slug) || null;
}

// Get location config with fallback to first location
export function getLocationOrDefault(slug: string): LocationConfig {
  return getLocation(slug) || LOCATIONS[0];
}

// Get all location slugs
export function getAllLocationSlugs(): string[] {
  return LOCATIONS.map(loc => loc.slug);
}

// Get all location names for dropdown
export function getAllLocationOptions(): Array<{ slug: string; name: string }> {
  return LOCATIONS.map(loc => ({ slug: loc.slug, name: loc.name }));
}

// Get location options filtered by region
export function getLocationOptionsByRegion(region: string): Array<{ slug: string; name: string }> {
  return LOCATIONS
    .filter(loc => loc.region === region)
    .map(loc => ({ slug: loc.slug, name: loc.name }));
}

// Validate if slug is a known location
export function isValidLocation(slug: string): boolean {
  return LOCATIONS.some(loc => loc.slug === slug);
}

/**
 * TYPE EXPORTS
 */
export type LocationSlug = typeof LOCATIONS[number]['slug'];
