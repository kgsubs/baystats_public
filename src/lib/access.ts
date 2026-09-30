// Every location is free -- no login or subscription required.
export function isFreeLocation(_slug: string): boolean {
  return true;
}

// Locations with real data behind them. Everything else shows as coming soon.
export const LIVE_LOCATION_SLUGS = ['rodney-bay', 'marigot-bay'] as const;

export function isLiveLocation(slug: string): boolean {
  return (LIVE_LOCATION_SLUGS as readonly string[]).includes(slug);
}
