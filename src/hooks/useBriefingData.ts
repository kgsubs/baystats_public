// Briefing data hooks for Captain's Briefing v2.0
// Combines existing APIs with new briefing-specific endpoints

import { useState, useEffect, useCallback } from 'react';
import type {
  TropicalData,
  SunMoonData,
} from '../types/briefing';
import type { OfficeStatus, MarinaInfo } from './useClearance';

// ===== WEATHER BRIEFING =====

export interface WeatherBriefingData {
  location: string;
  current: {
    temperature: number;
    condition: string;
    humidity: number;
    wind_speed: number;
    wind_direction: string;
  };
  forecast: Array<{
    day: string;
    high: number;
    low: number;
    condition: string;
    precipitation_chance: number | null;
  }>;
  marine_forecast: {
    seas: string;
    winds: string;
    advisories: string[];
  };
  cached_at: string;
  next_update: string;
}

interface UseWeatherBriefingReturn {
  data: WeatherBriefingData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBriefingWeather(location: string = 'rodney-bay'): UseWeatherBriefingReturn {
  const [data, setData] = useState<WeatherBriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    setData(null);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/weather?location=${encodeURIComponent(location)}&_=${Date.now()}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const weatherData: WeatherBriefingData = await response.json();
      setData(weatherData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchWeather();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather, location]);

  return {
    data,
    loading,
    error,
    refetch: fetchWeather,
  };
}

// ===== VESSEL/MARINA BRIEFING =====

export interface VesselHistoryPoint {
  date: string;
  count: number;
}

export interface VesselBriefingData {
  current_count: number;
  recorded_at: string;
  time_of_day?: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  trend_percentage: number;
  average_7day: number;
  crowding_level: 'low' | 'moderate' | 'high';
  history: VesselHistoryPoint[];
  data_source: string;
  live_data: boolean;
  total_berths: number;
  occupancy_rate: number;
  next_check?: string;
  note?: string;
}

interface UseVesselBriefingReturn {
  data: VesselBriefingData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBriefingVessels(location: string = 'rodney-bay'): UseVesselBriefingReturn {
  const [data, setData] = useState<VesselBriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVessels = useCallback(async () => {
    setData(null);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/vessels?location=${encodeURIComponent(location)}&_=${Date.now()}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vessel data');
      }

      const vesselData: VesselBriefingData = await response.json();
      setData(vesselData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchVessels();

    // Auto-refresh every 15 minutes
    const interval = setInterval(fetchVessels, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchVessels, location]);

  return {
    data,
    loading,
    error,
    refetch: fetchVessels,
  };
}

// ===== CLEARANCE BRIEFING =====
// OfficeStatus and MarinaInfo imported from useClearance

export interface ClearanceBriefingData {
  customs: OfficeStatus;
  immigration: OfficeStatus;
  fees: {
    entry_per_person: number;
    exit_per_person: number;
    overtime_penalty: number;
  } | null;
  marina: MarinaInfo | null;
  last_updated: string | null;
  notes: string | null;
  current_ast_time?: string;
}

interface UseClearanceBriefingReturn {
  data: ClearanceBriefingData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBriefingClearance(location: string = 'rodney-bay'): UseClearanceBriefingReturn {
  const [data, setData] = useState<ClearanceBriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClearance = useCallback(async () => {
    setData(null);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clearance?location=${encodeURIComponent(location)}&_=${Date.now()}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch clearance information');
      }

      const clearanceData: ClearanceBriefingData = await response.json();
      setData(clearanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchClearance();

    // Auto-refresh every 5 minutes (office status can change)
    const interval = setInterval(fetchClearance, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchClearance, location]);

  return {
    data,
    loading,
    error,
    refetch: fetchClearance,
  };
}

// ===== TIDES / CURRENTS =====
// Removed: the tide and current cards showed a server-side sine-wave
// estimate labeled as fact. Re-add only when backed by a real tide/current
// data provider.

// ===== TROPICAL SYSTEMS BRIEFING =====

interface UseTropicalBriefingReturn {
  data: TropicalData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBriefingTropical(location: string = 'rodney-bay'): UseTropicalBriefingReturn {
  const [data, setData] = useState<TropicalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTropical = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tropical?location=${encodeURIComponent(location)}&_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tropical weather data');
      }

      const tropicalData: TropicalData = await response.json();
      setData(tropicalData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      // A failed refetch must not leave a previous "clear" or "active"
      // reading on screen looking current: mark it unavailable instead.
      setData((prev) => (prev ? { ...prev, status: 'unavailable' } : prev));
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchTropical();

    // Auto-refresh every 30 minutes (NHC updates every 3-6 hours)
    const interval = setInterval(fetchTropical, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTropical, location]);

  return {
    data,
    loading,
    error,
    refetch: fetchTropical,
  };
}

// ===== SUN/MOON BRIEFING =====

interface UseSunMoonBriefingReturn {
  data: SunMoonData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBriefingSunMoon(location: string = 'rodney-bay'): UseSunMoonBriefingReturn {
  const [data, setData] = useState<SunMoonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSunMoon = useCallback(async () => {
    setData(null);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sunmoon?location=${encodeURIComponent(location)}&_=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sun/moon data');
      }

      const sunMoonData: SunMoonData = await response.json();
      setData(sunMoonData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchSunMoon();

    // Auto-refresh every hour (sun/moon data changes slowly)
    const interval = setInterval(fetchSunMoon, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSunMoon, location]);

  return {
    data,
    loading,
    error,
    refetch: fetchSunMoon,
  };
}

// ===== WIND FIELD =====

export interface WindFieldReadingData {
  speedKt: number;
  gustKt: number;
  directionDeg: number;
}

export interface WindFieldResponse {
  status: 'ok' | 'error';
  cached?: boolean;
  observedAt: string;
  offshore: WindFieldReadingData;
  anchorage: WindFieldReadingData;
  anchorageEstimated?: boolean;
  grid: Array<{ lat: number; lon: number; speedKt: number; gustKt: number; directionDeg: number }>;
}

interface UseWindFieldReturn {
  data: WindFieldResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// No cache-busting here on purpose: the backend owns a ten-minute cache and the card
// is served from it, so a page view must not trigger an upstream call.
export function useBriefingWindField(location: string = 'rodney-bay'): UseWindFieldReturn {
  const [data, setData] = useState<WindFieldResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWindField = useCallback(async () => {
    setData(null);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/wind-field?location=${encodeURIComponent(location)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wind field data');
      }

      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchWindField();
  }, [fetchWindField]);

  return { data, loading, error, refetch: fetchWindField };
}
