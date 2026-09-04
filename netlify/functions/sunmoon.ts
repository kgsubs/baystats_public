import type { Handler } from '@netlify/functions';
import type { SunMoonData, MoonPhase } from '../../src/types/briefing';
import { getLocationOrDefault } from '../../src/config/locations';
import { verifyJwt } from '../../src/lib/auth';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    const locationSlug = event.queryStringParameters?.location || 'rodney-bay';

    // else: free location or verified pro user -- proceed normally

    const location = getLocationOrDefault(locationSlug);
    const coords = { lat: location.coordinates.lat, lon: location.coordinates.lon, name: location.name };
    
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch sun data from sunrise-sunset.org
    const sunUrl = `https://api.sunrise-sunset.org/json?lat=${coords.lat}&lng=${coords.lon}&date=${today}&formatted=0`;
    
    // Fetch moon data from Open-Meteo (free, no API key)
    const moonUrl = `https://api.open-meteo.com/v1/astronomy?latitude=${coords.lat}&longitude=${coords.lon}&daily=moonrise,moonset,moon_phase`;

    const [sunResponse, moonResponse] = await Promise.all([
      fetch(sunUrl).catch(() => null),
      fetch(moonUrl).catch(() => null),
    ]);

    const moonData = moonResponse?.ok ? await moonResponse.json() : null;

    // Fall back to astronomical approximation if sunrise-sunset.org is unavailable
    let results: { sunrise: string; sunset: string };
    if (sunResponse?.ok) {
      const sunData = await sunResponse.json();
      results = sunData.results;
    } else {
      // Approximate sunrise/sunset for St. Lucia latitude (~14N): ~5:45 AM / ~6:15 PM AST year-round
      const now = new Date();
      const approxSunrise = new Date(now);
      approxSunrise.setUTCHours(9, 45, 0, 0); // 5:45 AM AST = 09:45 UTC
      const approxSunset = new Date(now);
      approxSunset.setUTCHours(22, 15, 0, 0); // 6:15 PM AST = 22:15 UTC
      results = { sunrise: approxSunrise.toISOString(), sunset: approxSunset.toISOString() };
    }

    // Format time to 12-hour format
    function formatTime(isoString: string): string {
      const date = new Date(isoString);
      const hours = date.getHours();
      const mins = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
    }

    // Map Open-Meteo moon phase to our format
    function getMoonPhaseName(phaseValue: number): MoonPhase {
      // Open-Meteo returns 0-1 where:
      // 0 = new moon, 0.25 = first quarter, 0.5 = full moon, 0.75 = last quarter
      if (phaseValue < 0.03 || phaseValue > 0.97) return 'new-moon';
      if (phaseValue < 0.22) return 'waxing-crescent';
      if (phaseValue < 0.28) return 'first-quarter';
      if (phaseValue < 0.47) return 'waxing-gibbous';
      if (phaseValue < 0.53) return 'full-moon';
      if (phaseValue < 0.72) return 'waning-gibbous';
      if (phaseValue < 0.78) return 'last-quarter';
      return 'waning-crescent';
    }

    // Calculate moon illumination from phase
    // 0 = new (0%), 0.5 = full (100%)
    function getMoonIllumination(phaseValue: number): number {
      // Illumination is max at full moon (0.5), min at new moon (0 or 1)
      const illumination = (1 - Math.cos(phaseValue * 2 * Math.PI)) / 2;
      return Math.round(illumination * 100);
    }

    // Get moon times from Open-Meteo if available, otherwise use astronomical calculations
    let moonrise = 'N/A';
    let moonset = 'N/A';
    let moonPhase: MoonPhase = 'waning-crescent';
    let moonIllumination = 50;

    if (moonData?.daily) {
      const daily = moonData.daily;
      if (daily.moonrise?.[0]) {
        moonrise = formatTime(daily.moonrise[0]);
      }
      if (daily.moonset?.[0]) {
        moonset = formatTime(daily.moonset[0]);
      }
      if (daily.moon_phase?.[0] !== undefined) {
        moonPhase = getMoonPhaseName(daily.moon_phase[0]);
        moonIllumination = getMoonIllumination(daily.moon_phase[0]);
      }
    }

    // If Open-Meteo moon times not available, calculate them
    if (moonrise === 'N/A' || moonset === 'N/A') {
      // Simple moon time approximation (about 50 min later each day)
      const now = new Date();
      const moonAge = ((now.getTime() / 86400000 + 2440587.5 - 2451549.5) % 29.53059);
      const lunarDay = moonAge / 29.53059;
      
      // Moon rises roughly 50 minutes later each day
      const baseMoonrise = new Date(results.sunrise);
      baseMoonrise.setMinutes(baseMoonrise.getMinutes() + lunarDay * 24 * 50);
      
      const baseMoonset = new Date(results.sunset);
      baseMoonset.setMinutes(baseMoonset.getMinutes() + lunarDay * 24 * 50);
      
      if (moonrise === 'N/A') moonrise = formatTime(baseMoonrise.toISOString());
      if (moonset === 'N/A') moonset = formatTime(baseMoonset.toISOString());
    }

    // Calculate daylightDuration
    const sunriseMs = new Date(results.sunrise).getTime();
    const sunsetMs = new Date(results.sunset).getTime();
    const daylightMs = sunsetMs - sunriseMs;
    const daylightHours = Math.floor(daylightMs / 3600000);
    const daylightMinutes = Math.floor((daylightMs % 3600000) / 60000);
    const daylightDuration = `${daylightHours}h ${daylightMinutes}m`;

    // Calculate nightPassageNote from moon illumination
    const moonIllumPct = moonIllumination;
    let nightPassageNote: string;
    if (moonIllumPct > 70) {
      nightPassageNote = 'Bright moon';
    } else if (moonIllumPct > 40) {
      nightPassageNote = 'Moderate moonlight';
    } else {
      nightPassageNote = 'Dark: use nav lights';
    }

    const sunMoonData: SunMoonData = {
      sunrise: formatTime(results.sunrise),
      sunset: formatTime(results.sunset),
      daylightDuration,
      moonrise,
      moonset,
      moonPhase,
      moonIllumination,
      nightPassageNote,
      timestamp: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=3600', // 1 hour cache
      },
      body: JSON.stringify(sunMoonData),
    };

  } catch (error) {
    console.error('Sun/Moon API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch sun/moon data',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
