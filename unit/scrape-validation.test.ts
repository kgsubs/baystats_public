import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeMarinaData } from '../netlify/functions/marina-scrape.ts';

const validExtraction = {
  name: 'Rodney Bay Marina',
  location: 'Rodney Bay',
  address: '123 Marina Way',
  phone: '+1 758-452-0324',
  website: 'http://www.igy-rodneybay.com',
  latitude: 14.0808,
  longitude: -60.9551,
  boat_size_capacity: 'small sailboats to large yachts',
  total_berths: 253,
  mooring_ball_availability: 'Not specified',
  restrooms_showers: 'Available',
  water_depth: '4.5 meters',
  fuel_dock: 'Available',
  water_availability: 'Available',
  power_connections: '110/220V',
  maintenance_repair: 'Available',
  chandlery: 'Available',
  wifi: 'Available',
  amenities: ['laundry', 'restaurants'],
  clearance_notes: 'Customs on site',
  customs_hours_structured: { mon_fri: { open: '08:00', close: '16:00' } },
  immigration_hours_structured: { mon_fri: { open: '08:00', close: '16:00' } },
};

test('a well-formed extraction passes through with its values intact', () => {
  const result = sanitizeMarinaData(validExtraction);
  assert.ok('data' in result, 'expected a data result, got an error');
  if ('data' in result) {
    assert.equal(result.data.name, 'Rodney Bay Marina');
    assert.equal(result.data.total_berths, 253);
    assert.deepEqual(result.data.amenities, ['laundry', 'restaurants']);
  }
});

test('missing name is rejected outright, not written with a placeholder', () => {
  const { name, ...withoutName } = validExtraction;
  const result = sanitizeMarinaData(withoutName);
  assert.ok('error' in result);
});

test('missing location is rejected outright', () => {
  const { location, ...withoutLocation } = validExtraction;
  const result = sanitizeMarinaData(withoutLocation);
  assert.ok('error' in result);
});

test('a wrong-typed field is zeroed to its safe default, not written as-is', () => {
  const result = sanitizeMarinaData({
    ...validExtraction,
    total_berths: 'a lot', // should be a number or null
    amenities: 'wifi, laundry', // should be an array
  });
  assert.ok('data' in result);
  if ('data' in result) {
    assert.equal(result.data.total_berths, null);
    assert.deepEqual(result.data.amenities, []);
  }
});

test('"Not specified" and empty strings for optional text fields become null, not the literal string', () => {
  const result = sanitizeMarinaData({ ...validExtraction, address: '', phone: undefined });
  assert.ok('data' in result);
  if ('data' in result) {
    assert.equal(result.data.address, null);
    assert.equal(result.data.phone, null);
  }
});

test('malformed office hours become null instead of a fabricated default schedule', () => {
  const result = sanitizeMarinaData({
    ...validExtraction,
    customs_hours_structured: { sat: { open: '08:00', close: '12:00' } }, // no mon_fri
  });
  assert.ok('data' in result);
  if ('data' in result) {
    assert.equal(result.data.customs_hours_structured, null);
  }
});

test('no data at all is rejected', () => {
  const result = sanitizeMarinaData(null);
  assert.ok('error' in result);
});
