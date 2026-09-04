// Briefing data types for Captain's Briefing v2.0

// Badge types used across briefing cards
export type BadgeType =
  | 'live'
  | 'clear'
  | 'active'
  | 'yesterday'
  | 'weak'
  | 'moderate'
  | 'strong';

// Moon phase types
export type MoonPhase =
  | 'new-moon'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full-moon'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

// Tide trend types
export type TideTrend = 'rising' | 'falling' | 'high' | 'low';

// Current type (ebb = outgoing, flood = incoming)
export type CurrentType = 'ebb' | 'flood' | 'slack';

// Current status based on speed
export type CurrentStatus = 'weak' | 'moderate' | 'strong';

// Chart data point structure
export interface ChartPoint {
  time: string;  // ISO timestamp or hour label
  value: number; // Tide level (ft) or current speed (kts)
}

// Tides Card Data
export interface TideData {
  currentLevel: number;      // Current tide level in feet
  trend: TideTrend;          // Rising, falling, high, or low
  changeRate: string;        // e.g., "0.3 ft/hr"
  nextHigh: {
    time: string;            // e.g., "2:42 PM"
    height: number;          // Height in feet
  };
  nextLow: {
    time: string;
    height: number;
  };
  chartData: ChartPoint[];   // 24-hour tide chart data
  timestamp: string;         // Last update time (ISO format)
}

// Tropical Systems Card Data
export interface TropicalSystem {
  name: string;              // e.g., "Tropical Storm Bret"
  category: string;          // e.g., "Tropical Storm", "Hurricane Cat 2"
  position: string;          // e.g., "14.5°N 58.2°W"
  distance: number;          // Distance in nautical miles
  bearing: string;           // e.g., "E", "NE"
  windSpeed: {
    kts: number;
    mph: number;
  };
  movement: string;          // e.g., "W at 18 mph"
  pressure: string;          // e.g., "1004 mb"
  watches: string[];         // Active watches/warnings
  advisoryUrl: string;       // Link to NHC advisory
}

export interface TropicalOutlookItem {
  area: string;              // e.g., "Atlantic", "Caribbean", "Gulf"
  description: string;       // Text description of the disturbance
  chance48h: string;         // Formation chance through 48 hours
  chance5day: string;        // Formation chance through 5 days
  pressure?: string;         // Pressure in mb if available
  winds?: string;            // Wind speed if available
}

export interface TropicalData {
  status: 'clear' | 'active';
  activeSystems: TropicalSystem[];
  outlook?: TropicalOutlookItem[];  // Tropical Weather Outlook from TWOAT.xml
  issuedAt?: string;         // When the outlook was issued (e.g., "700 PM EST Sun Nov 30 2025")
  forecaster?: string;       // Name of forecaster (e.g., "Bucci")
  additionalInfo?: string;   // Additional info text (e.g., off-season notice)
  nextUpdate: string;        // Next update time
  nhcUrl: string;            // Link to NHC Atlantic page
  timestamp: string;
}

// Sun/Moon Card Data
export interface SunMoonData {
  sunrise: string;           // e.g., "5:42 AM"
  sunset: string;            // e.g., "6:18 PM"
  daylightDuration: string;  // e.g., "12h 36m"
  moonPhase: MoonPhase;
  moonIllumination: number;  // Percentage (0-100)
  moonrise: string;
  moonset: string;
  nightPassageNote: string;  // Human-readable assessment
  timestamp: string;
}

// Currents Card Data
export interface CurrentData {
  speed: number;             // Current speed in knots
  direction: string;         // e.g., "ENE"
  directionDegrees: number;  // Bearing in degrees (0-360)
  type: CurrentType;         // ebb, flood, or slack
  status: CurrentStatus;     // weak, moderate, or strong
  interpretation: string;    // e.g., "Good for dinghy transit"
  maxEbb: {
    time: string;
    speed: number;
  };
  maxFlood: {
    time: string;
    speed: number;
  };
  chartData: ChartPoint[];   // 24-hour current chart data
  timestamp: string;
}
