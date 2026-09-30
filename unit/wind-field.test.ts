import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWindField } from '../netlify/functions/wind-field.ts';
import { getWindFieldLocation } from '../src/config/windField.ts';

const location = getWindFieldLocation('rodney-bay')!;

function stubFetchOnce(body: unknown) {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    json: async () => body,
  })) as typeof fetch;
  return () => { globalThis.fetch = original; };
}

test('a missing reading fails the fetch instead of being reported as 0 kt', async () => {
  // 8 sample points, matching location.samplePoints.length; one point's
  // current.wind_speed_10m is null, as Open-Meteo sends for a point it
  // could not resolve.
  const results = Array.from({ length: 8 }, (_, i) => ({
    current: {
      time: '2026-09-30T12:00',
      wind_speed_10m: i === 3 ? null : 12,
      wind_gusts_10m: 15,
      wind_direction_10m: 90,
    },
  }));
  const restore = stubFetchOnce(results);
  try {
    await assert.rejects(
      () => fetchWindField(location),
      /non-numeric wind value/,
      'a null reading must fail closed, not silently become 0 kt'
    );
  } finally {
    restore();
  }
});

test('a full set of real readings succeeds', async () => {
  const results = Array.from({ length: 8 }, () => ({
    current: {
      time: '2026-09-30T12:00',
      wind_speed_10m: 14,
      wind_gusts_10m: 18,
      wind_direction_10m: 67.5,
    },
  }));
  const restore = stubFetchOnce(results);
  try {
    const payload = await fetchWindField(location);
    assert.equal(payload.offshore.speedKt, 14);
  } finally {
    restore();
  }
});
