import type { Handler } from '@netlify/functions';
import type { TideData, ChartPoint } from '../../src/types/briefing';
import { getLocationOrDefault } from '../../src/config/locations';
import { verifyJwt } from '../../src/lib/auth';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Semi-diurnal tide calculator
function calculateTides(locationSlug: string = 'rodney-bay'): TideData {
  const location = getLocationOrDefault(locationSlug);
  const loc = { name: location.name, meanLevel: location.tideParams.meanLevel, amplitude: location.tideParams.amplitude };
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const decimalHour = hour + minute / 60;

  // Semi-diurnal tide period: 12.42 hours
  const tidePeriod = 12.42;
  const radians = (decimalHour / tidePeriod) * 2 * Math.PI;

  // Use location-specific parameters
  const meanLevel = loc.meanLevel;
  const amplitude = loc.amplitude;
  const currentLevel = meanLevel + amplitude * Math.sin(radians - Math.PI / 2);

  // Calculate trend
  const derivative = Math.cos(radians - Math.PI / 2);
  let trend: 'rising' | 'falling' | 'high' | 'low';
  
  if (Math.abs(derivative) < 0.1) {
    trend = derivative > 0 ? 'low' : 'high';
  } else {
    trend = derivative > 0 ? 'rising' : 'falling';
  }

  // Calculate change rate (ft/hr)
  const changeRate = Math.abs(amplitude * derivative * (2 * Math.PI / tidePeriod));

  // Find next high and low tides
  const currentPhase = radians - Math.PI / 2;
  
  // Time to next high (when sin will be 1)
  let timeToNextHigh = ((Math.PI / 2) - currentPhase) / (2 * Math.PI) * tidePeriod;
  if (timeToNextHigh < 0) timeToNextHigh += tidePeriod;
  
  // Time to next low (when sin will be -1)
  let timeToNextLow = ((3 * Math.PI / 2) - currentPhase) / (2 * Math.PI) * tidePeriod;
  if (timeToNextLow < 0) timeToNextLow += tidePeriod;

  const nextHighTime = new Date(now.getTime() + timeToNextHigh * 60 * 60 * 1000);
  const nextLowTime = new Date(now.getTime() + timeToNextLow * 60 * 60 * 1000);

  // Generate 24-hour chart data
  const chartData: ChartPoint[] = Array.from({ length: 24 }, (_, i) => {
    const r = ((hour + i) % 24 / tidePeriod) * 2 * Math.PI;
    const level = loc.meanLevel + loc.amplitude * Math.sin(r - Math.PI / 2);
    const time = new Date(now);
    time.setHours((hour + i) % 24, 0, 0, 0);
    return {
      time: time.toISOString(),
      value: Math.round(level * 10) / 10,
    };
  });

  function formatTime(date: Date): string {
    const hours = date.getHours();
    const mins = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
  }

  return {
    currentLevel: Math.round(currentLevel * 10) / 10,
    trend,
    changeRate: `${changeRate.toFixed(1)} ft/hr`,
    nextHigh: {
      time: formatTime(nextHighTime),
      height: Math.round((meanLevel + amplitude) * 10) / 10,
    },
    nextLow: {
      time: formatTime(nextLowTime),
      height: Math.round((meanLevel - amplitude) * 10) / 10,
    },
    chartData,
    timestamp: now.toISOString(),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    const location = event.queryStringParameters?.location || 'rodney-bay';

    // else: free location or verified pro user -- proceed normally

    const tideData = calculateTides(location);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      body: JSON.stringify(tideData),
    };

  } catch (error) {
    console.error('Tides Error:', error);
    // Return calculated data even on error
    const fallbackData = calculateTides();
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      body: JSON.stringify(fallbackData),
    };
  }
};
