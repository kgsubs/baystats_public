import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { getWindFieldLocation } from '../../src/config/windField'
import type { WindFieldLocation } from '../../src/config/windField'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || ''

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

const origin = process.env.SITE_URL || 'https://baystats.com'
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
}

const CACHE_MS = 10 * 60 * 1000

// ---------------------------------------------------------------------------
// Shelter estimate.
//
// Open-Meteo's finest grid is a few kilometres across, so it returns the same
// wind at every one of the eight sample points: it cannot see that the
// anchorage is calmer than the open sea. Rather than print the same number
// twice, the two in-bay points are reduced by a terrain factor derived from
// wind direction against the mouth of the bay.
//
// This is an ESTIMATE, not an observation, and is flagged as such in the
// payload so the card can label it. It is never applied to the offshore
// points, and it can only reduce a wind speed, never raise it.
//
// Wind arriving from the bearing a bay's mouth faces blows straight into the
// anchorage and is barely reduced. Wind from the opposite side crosses the
// island first and arrives much weaker. Each location carries its own bearing.
// ---------------------------------------------------------------------------
const MIN_SHELTER_FACTOR = 0.40
const MAX_SHELTER_FACTOR = 1.00

export function shelterFactor(windFromDeg: number, bayMouthBearing: number): number {
  const offset = ((windFromDeg - bayMouthBearing) * Math.PI) / 180
  const alignment = Math.cos(offset)            // 1 straight in, -1 straight over the land
  const t = (1 + alignment) / 2                 // 0 fully sheltered, 1 fully exposed
  return MIN_SHELTER_FACTOR + (MAX_SHELTER_FACTOR - MIN_SHELTER_FACTOR) * t
}

interface GridPoint {
  lat: number
  lon: number
  speedKt: number
  gustKt: number
  directionDeg: number
}

interface WindFieldPayload {
  observedAt: string
  offshore: { speedKt: number; gustKt: number; directionDeg: number }
  anchorage: { speedKt: number; gustKt: number; directionDeg: number }
  /** True when the anchorage figure came from the shelter model, not the feed. */
  anchorageEstimated: boolean
  grid: GridPoint[]
}

function buildUrl(location: WindFieldLocation): string {
  const lats = location.samplePoints.map(p => p.lat).join(',')
  const lons = location.samplePoints.map(p => p.lon).join(',')
  return 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${lats}`
    + `&longitude=${lons}`
    + '&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m'
    + '&wind_speed_unit=kn'
    + '&timezone=UTC'
}

// A batched request returns an array; a single-coordinate request returns an object.
function asArray(json: unknown): Array<Record<string, any>> {
  return Array.isArray(json) ? json : [json as Record<string, any>]
}

function summarize(grid: GridPoint[], indices: number[]) {
  const picked = indices.map(i => grid[i]).filter(Boolean)
  if (picked.length === 0) {
    return { speedKt: 0, gustKt: 0, directionDeg: 0 }
  }
  // Take the strongest of the group -- the card is answering "how bad does it get here".
  const strongest = picked.reduce((a, b) => (b.speedKt > a.speedKt ? b : a))
  return {
    speedKt: Math.round(strongest.speedKt),
    gustKt: Math.round(Math.max(...picked.map(p => p.gustKt))),
    directionDeg: Math.round(strongest.directionDeg),
  }
}

async function fetchWindField(location: WindFieldLocation): Promise<WindFieldPayload> {
  const { samplePoints, offshoreIndices, anchorageIndices, bayMouthBearing } = location

  const response = await fetch(buildUrl(location))
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`)
  }

  const results = asArray(await response.json())
  if (results.length !== samplePoints.length) {
    throw new Error(`Open-Meteo returned ${results.length} results, expected ${samplePoints.length}`)
  }

  const grid: GridPoint[] = results.map((result, i) => {
    const current = result.current || {}
    return {
      lat: samplePoints[i].lat,
      lon: samplePoints[i].lon,
      speedKt: Number(current.wind_speed_10m ?? 0),
      gustKt: Number(current.wind_gusts_10m ?? 0),
      directionDeg: Number(current.wind_direction_10m ?? 0),
    }
  })

  if (grid.some(p => !Number.isFinite(p.speedKt) || !Number.isFinite(p.directionDeg))) {
    throw new Error('Open-Meteo returned a non-numeric wind value')
  }

  const observedAt = results[0]?.current?.time
    ? new Date(`${results[0].current.time}Z`).toISOString()
    : new Date().toISOString()

  const offshore = summarize(grid, offshoreIndices)

  // The feed gives the in-bay points the same wind as the open sea. Apply the
  // shelter factor to those two points so the map and the row agree, and mark
  // the result as an estimate.
  const rawAnchorage = summarize(grid, anchorageIndices)
  const factor = shelterFactor(offshore.directionDeg, bayMouthBearing)
  const estimated = anchorageIndices.every(
    i => Math.abs(grid[i].speedKt - grid[offshoreIndices[0]].speedKt) < 0.05
  )

  if (estimated) {
    for (const i of anchorageIndices) {
      grid[i] = {
        ...grid[i],
        speedKt: grid[i].speedKt * factor,
        gustKt: grid[i].gustKt * factor,
      }
    }
  }

  return {
    observedAt,
    offshore,
    anchorage: estimated
      ? {
          speedKt: Math.round(rawAnchorage.speedKt * factor),
          gustKt: Math.round(rawAnchorage.gustKt * factor),
          directionDeg: rawAnchorage.directionDeg,
        }
      : rawAnchorage,
    anchorageEstimated: estimated,
    grid,
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  const locationSlug = event.queryStringParameters?.location || 'rodney-bay'

  // No basemap, no card. A location is never served another bay's wind.
  const location = getWindFieldLocation(locationSlug)
  if (!location) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'error', reason: 'no_wind_field_for_location' })
    }
  }

  const supabase = getSupabaseAdmin()

  // Serve from cache while it is inside the ten-minute window.
  const { data: cached } = await supabase
    .from('wind_field_cache')
    .select('payload, fetched_at')
    .eq('location_slug', locationSlug)
    .maybeSingle()

  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_MS) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'ok', cached: true, ...cached.payload })
    }
  }

  try {
    const payload = await fetchWindField(location)

    await supabase
      .from('wind_field_cache')
      .upsert({
        location_slug: locationSlug,
        payload,
        observed_at: payload.observedAt,
        fetched_at: new Date().toISOString(),
      }, { onConflict: 'location_slug' })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'ok', cached: false, ...payload })
    }
  } catch (err) {
    console.error('Wind field fetch failed:', err instanceof Error ? err.message : err)

    // Last good payload keeps the stale state honest; the card ages it from observedAt.
    if (cached) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'ok', cached: true, ...cached.payload })
      }
    }

    // Nothing to show. The card removes the map rather than inventing arrows.
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'error' })
    }
  }
}
