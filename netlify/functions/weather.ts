import type { Handler } from '@netlify/functions';
import { getLocationOrDefault } from '../../src/config/locations';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Map WMO weather codes to conditions
function getWeatherCondition(code: number): string {
  // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
  const codes: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with heavy hail',
  };
  return codes[code] || 'Unknown';
}

// Get weather icon based on condition
function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code === 1) return '🌤️';
  if (code === 2) return '⛅';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '🌨️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '🌤️';
}

// Get wind direction from degrees
function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    // Get location from query params (default to rodney-bay)
    const locationSlug = event.queryStringParameters?.location || 'rodney-bay';

    const location = getLocationOrDefault(locationSlug);
    const coords = { lat: location.coordinates.lat, lon: location.coordinates.lon, name: location.displayName };
    
    // Open-Meteo API - Free, no API key required
    // Includes: current weather, hourly forecasts, marine data
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl&hourly=temperature_2m,weather_code,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=America/St_Lucia&forecast_days=3&wind_speed_unit=kn`;
    
    // Marine forecast from Open-Meteo (wave height, sea temp, etc.)
    // length_unit=imperial so wave_height comes back in feet, matching the "ft" label below
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${coords.lat}&longitude=${coords.lon}&hourly=wave_height,wave_direction&daily=wave_height_max&timezone=America/St_Lucia&length_unit=imperial`;

    const [weatherResponse, marineResponse] = await Promise.all([
      fetch(weatherUrl),
      fetch(marineUrl).catch(() => null), // Marine is optional
    ]);

    if (!weatherResponse.ok) {
      throw new Error(`Open-Meteo API error: ${weatherResponse.status}`);
    }

    // Open-Meteo's response shape isn't typed here; cast rather than
    // duplicate its schema for a handful of field reads.
    const weatherData: any = await weatherResponse.json();
    const marineData: any = marineResponse?.ok ? await marineResponse.json() : null;

    const current = weatherData.current;
    const daily = weatherData.daily;

    // Build forecast array
    const forecast = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      forecast.push({
        day: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[date.getDay()],
        high: Math.round(daily.temperature_2m_max[i]),
        low: Math.round(daily.temperature_2m_min[i]),
        condition: getWeatherCondition(daily.weather_code[i]),
        precipitation_chance: daily.precipitation_probability_max?.[i] ?? null,
      });
    }

    // Marine forecast
    // ?? , not ||: a real 0 m wave height (or a 0deg wave direction) is a
    // valid reading, not a missing one, and must not be coerced to null.
    const waveHeight = marineData?.hourly?.wave_height?.[0] ?? null;
    const waveDirection = marineData?.hourly?.wave_direction?.[0] ?? null;

    const response = {
      location: coords.name,
      current: {
        temperature: Math.round(current.temperature_2m),
        condition: getWeatherCondition(current.weather_code),
        humidity: current.relative_humidity_2m,
        wind_speed: Math.round(current.wind_speed_10m), // already knots (wind_speed_unit=kn)
        wind_direction: getWindDirection(current.wind_direction_10m),
        pressure: current.pressure_msl,
        icon: getWeatherIcon(current.weather_code),
      },
      forecast,
      marine_forecast: {
        seas: waveHeight ? `${waveHeight.toFixed(1)} ft ${waveDirection ? getWindDirection(waveDirection) + ' swell' : ''}` : 'Not available',
        winds: `${getWindDirection(current.wind_direction_10m)} at ${Math.round(current.wind_speed_10m)} kt`,
        advisories: [],
      },
      cached_at: new Date().toISOString(),
      next_update: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=900', // 15 min cache
      },
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Open-Meteo Weather Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch weather data',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
