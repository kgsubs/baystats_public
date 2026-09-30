import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shelterFactor } from '../netlify/functions/wind-field.ts';

// shelterFactor takes any bearing; this one is arbitrary and only used to
// check the shape of the curve (Rodney Bay's real bearing, 280, is in
// src/config/windField.ts).
const BAY_MOUTH_BEARING = 70;

test('wind arriving straight from the bay mouth is barely reduced', () => {
  const factor = shelterFactor(BAY_MOUTH_BEARING, BAY_MOUTH_BEARING);
  assert.ok(Math.abs(factor - 1.0) < 1e-9, `expected ~1.0, got ${factor}`);
});

test('wind arriving from the opposite side (over the land) is reduced the most', () => {
  const factor = shelterFactor(BAY_MOUTH_BEARING + 180, BAY_MOUTH_BEARING);
  assert.ok(Math.abs(factor - 0.4) < 1e-9, `expected ~0.4, got ${factor}`);
});

test('a crosswind (90 degrees off the mouth) sits halfway between', () => {
  const factor = shelterFactor(BAY_MOUTH_BEARING + 90, BAY_MOUTH_BEARING);
  assert.ok(Math.abs(factor - 0.7) < 1e-9, `expected ~0.7, got ${factor}`);
});

test('the factor never drops below the minimum or exceeds the maximum', () => {
  for (let deg = 0; deg < 360; deg += 15) {
    const factor = shelterFactor(deg, BAY_MOUTH_BEARING);
    assert.ok(factor >= 0.4 && factor <= 1.0, `${deg} degrees produced out-of-range factor ${factor}`);
  }
});

test('is symmetric: the same angular offset on either side gives the same factor', () => {
  const plus = shelterFactor(BAY_MOUTH_BEARING + 40, BAY_MOUTH_BEARING);
  const minus = shelterFactor(BAY_MOUTH_BEARING - 40, BAY_MOUTH_BEARING);
  assert.ok(Math.abs(plus - minus) < 1e-9, `expected symmetric factors, got ${plus} vs ${minus}`);
});
