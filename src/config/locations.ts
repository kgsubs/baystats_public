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
    region: 'Grenada',
    country: 'Grenada',
    timezone: 'America/Grenada',
  },
  {
    slug: 'grenada-marine',
    name: 'Grenada Marine',
    displayName: 'Grenada Marine, Grenada',
    coordinates: { lat: 12.0209, lon: -61.6794 },
    region: 'Grenada',
    country: 'Grenada',
    timezone: 'America/Grenada',
  },
  {
    slug: 'le-marin',
    name: 'Le Marin',
    displayName: 'Le Marin, Martinique',
    coordinates: { lat: 14.4719, lon: -60.8736 },
    region: 'Martinique',
    country: 'Martinique',
    timezone: 'America/Martinique',
  },
  {
    slug: 'les-trois-ilets',
    name: 'Les Trois-Îlets',
    displayName: 'Les Trois-Îlets, Martinique',
    coordinates: { lat: 14.5459, lon: -61.0326 },
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
    region: 'Martinique',
    country: 'Martinique',
    timezone: 'America/Martinique',
  },
  {
    slug: 'pointe-du-bout',
    name: 'Pointe du Bout',
    displayName: 'Pointe du Bout, Martinique',
    coordinates: { lat: 14.5577, lon: -61.0508 },
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
    region: 'Grenada',
    country: 'Grenada',
    timezone: 'America/Grenada',
  },
  {
    slug: 'st-georges',
    name: "St. George's",
    displayName: "St. George's, Grenada",
    coordinates: { lat: 12.0480, lon: -61.7515 },
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
