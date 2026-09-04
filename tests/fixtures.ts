// Canned API responses so the suite runs without a database or any API keys.
import type { Page } from '@playwright/test'

const now = () => new Date().toISOString()

export const windField = {
  status: 'ok',
  observedAt: now(),
  offshore: { speedKt: 14, gustKt: 18, directionDeg: 67.5 },
  anchorage: { speedKt: 6, gustKt: 9, directionDeg: 67.5 },
  anchorageEstimated: true,
  grid: [
    { lat: 14.098, lon: -61.000 }, { lat: 14.083, lon: -61.000 }, { lat: 14.070, lon: -61.000 },
    { lat: 14.098, lon: -60.985 }, { lat: 14.083, lon: -60.985 }, { lat: 14.070, lon: -60.985 },
    { lat: 14.083, lon: -60.968 }, { lat: 14.075, lon: -60.962 },
  ].map((p, i) => ({ ...p, speedKt: i >= 6 ? 6 : 14, gustKt: 18, directionDeg: 67.5 })),
}

export const weather = {
  location: 'Rodney Bay, St. Lucia',
  current: { temperature: 88, condition: 'Clear Sky', humidity: 66, wind_speed: 9, wind_direction: 'ENE' },
  forecast: [
    { day: 'Today', high: 90, low: 81, condition: 'Light Drizzle', precipitation_chance: 40 },
    { day: 'Tomorrow', high: 88, low: 81, condition: 'Light Drizzle', precipitation_chance: 40 },
    { day: 'Saturday', high: 90, low: 75, condition: 'Thunderstorm', precipitation_chance: 60 },
  ],
  marine_forecast: { seas: '3.0 ft ENE swell', winds: 'ENE at 9 mph', advisories: [] },
  cached_at: now(),
  next_update: now(),
}

export const tropical = {
  status: 'clear',
  activeSystems: [],
  outlook: [
    { basin: 'North Atlantic', text: 'Tropical cyclone formation is not expected during the next 7 days.' },
    { basin: 'Caribbean Sea', text: 'Tropical cyclone formation is not expected during the next 7 days.' },
  ],
  cached_at: now(),
}

/**
 * Serve every backend call from fixtures.
 *
 * Playwright matches the most recently registered route first, so the catch-all
 * goes down before the specific handlers, never after.
 */
export async function stubApi(page: Page) {
  // Anything without a fixture answers as unavailable. The cards guard against a
  // failed fetch; they do not guard against a well-formed-looking empty object.
  await page.route('**/api/**', r =>
    r.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unavailable"}' }))
  await page.route('**/api/session/check*', r =>
    r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not authenticated' }) }))
  await page.route('**/api/tropical*', r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tropical) }))
  await page.route('**/api/weather*', r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(weather) }))
  await page.route('**/api/wind-field*', r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(windField) }))
}
