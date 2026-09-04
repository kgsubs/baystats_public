import type { Handler } from '@netlify/functions';
import type { CurrentData, ChartPoint } from '../../src/types/briefing';
import { getLocationOrDefault } from '../../src/config/locations';
import { verifyJwt } from '../../src/lib/auth';

// Currents calculator (ebb/flood based on tide lag)
function calculateCurrents(locationSlug: string = 'rodney-bay'): CurrentData {
  const location = getLocationOrDefault(locationSlug);
  const loc = { name: location.name, meanSpeed: location.currentParams.meanSpeed, amplitude: location.currentParams.amplitude };
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const decimalHour = hour + minute / 60;

  // Tide period: 12.42 hours
  const tidePeriod = 12.42;
  
  // Current lags tide by ~3 hours
  const lagHours = 3;
  const laggedHour = (decimalHour - lagHours + 24) % 24;
  const radians = (laggedHour / tidePeriod) * 2 * Math.PI;

  // Current speed based on location
  const meanSpeed = loc.meanSpeed;
  const amplitude = loc.amplitude;
  const speed = meanSpeed + amplitude * Math.abs(Math.sin(radians));
  const currentSpeed = Math.round(speed * 10) / 10;

  // Flood = incoming (rising tide), Ebb = outgoing (falling tide)
  // Derivative of tide curve determines direction
  const tideRadians = (decimalHour / tidePeriod) * 2 * Math.PI;
  const tideDerivative = Math.cos(tideRadians - Math.PI / 2);
  const isFlood = tideDerivative > 0;
  const type = Math.abs(tideDerivative) < 0.1 ? 'slack' : isFlood ? 'flood' : 'ebb';

  // Direction: Flood from ENE (67°), Ebb to WSW (247°)
  const directionDegrees = isFlood ? 67 : 247;
  const direction = isFlood ? 'ENE' : 'WSW';

  // Status based on speed
  let status: 'weak' | 'moderate' | 'strong';
  let interpretation: string;
  if (currentSpeed < 1) {
    status = 'weak';
    interpretation = 'Easy transit';
  } else if (currentSpeed < 2) {
    status = 'moderate';
    interpretation = 'Good for dinghy';
  } else {
    status = 'strong';
    interpretation = 'Strong entrance current';
  }

  // Generate 24-hour chart
  const chartData: ChartPoint[] = Array.from({ length: 24 }, (_, i) => {
    const r = ((i - lagHours) / tidePeriod) * 2 * Math.PI;
    const s = meanSpeed + amplitude * Math.abs(Math.sin(r));
    const time = new Date(now);
    time.setHours(i, 0, 0, 0);
    return {
      time: time.toISOString(),
      value: Math.round(s * 10) / 10,
    };
  });

  // Calculate max ebb and flood times
  // Max current occurs when sin = 1 or -1
  const currentPhase = radians;
  
  // Time to max flood (when sin will be at max in flood direction)
  let timeToMaxFlood = (0 - currentPhase) / (2 * Math.PI) * tidePeriod;
  if (timeToMaxFlood < 0) timeToMaxFlood += tidePeriod;
  
  // Time to max ebb (when sin will be at max in ebb direction)
  let timeToMaxEbb = (Math.PI - currentPhase) / (2 * Math.PI) * tidePeriod;
  if (timeToMaxEbb < 0) timeToMaxEbb += tidePeriod;

  const maxFloodTime = new Date(now.getTime() + timeToMaxFlood * 60 * 60 * 1000);
  const maxEbbTime = new Date(now.getTime() + timeToMaxEbb * 60 * 60 * 1000);

  function formatTime(date: Date): string {
    const hours = date.getHours();
    const mins = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
  }

  return {
    speed: currentSpeed,
    direction,
    directionDegrees,
    type,
    status,
    interpretation,
    maxEbb: {
      time: formatTime(maxEbbTime),
      speed: Math.round((meanSpeed + amplitude) * 10) / 10,
    },
    maxFlood: {
      time: formatTime(maxFloodTime),
      speed: Math.round((meanSpeed + amplitude) * 10) / 10,
    },
    chartData,
    timestamp: now.toISOString(),
  };
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=1800', // 30 min cache
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }
  
  const location = event.queryStringParameters?.location || 'rodney-bay';

  // else: free location or verified pro user -- proceed normally

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const currentData = calculateCurrents(location);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(currentData),
    };
  } catch (error) {
    console.error('Currents API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch current data' }),
    };
  }
};
