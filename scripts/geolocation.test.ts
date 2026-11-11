import { describe, expect, it } from 'vitest';

import {
  formatGeolocations,
  normalizeGeolocations,
  placeKey,
  validateGeolocations
} from './geolocation.ts';

describe('placeKey', () => {
  it('joins the trimmed parts of the location', () => {
    expect(placeKey({ p: ' Linköping ', r: 'Östergötland', c: 'SE' })).toBe(
      'Linköping, Östergötland, SE'
    );
  });
});

describe('normalizeGeolocations', () => {
  it('converts strings into numbers and rounds them', () => {
    expect(
      normalizeGeolocations({ a: { lat: '55.6751812', lng: 12.12345678901 } })
    ).toEqual({ a: { lat: 55.675181, lng: 12.123457 } });
  });
});

describe('validateGeolocations', () => {
  it('reports invalid positions as errors', () => {
    const { errors } = validateGeolocations({
      'A, B, SE': { lat: Number.NaN, lng: 0 },
      'C, D, SE': { lat: 0, lng: 200 }
    });
    expect(errors).toHaveLength(2);
  });

  it('reports keys that do not look like places as warnings', () => {
    const { errors, warnings } = validateGeolocations({
      'Columbus, Ohio': { lat: 1, lng: 1 },
      '98ea3486c, Norrkping, stergtland': { lat: 1, lng: 1 },
      'Washington, Washington, D.C., US': { lat: 1, lng: 1 }
    });
    expect(errors).toEqual([]);
    expect(warnings).toHaveLength(2);
  });
});

describe('formatGeolocations', () => {
  it('writes one sorted place per line', () => {
    const text = formatGeolocations({
      'b, B, SE': { lat: 2, lng: 3.5 },
      'a, A, SE': { lat: -1.25, lng: 0 }
    });
    expect(text).toBe(
      '{\n' +
        '  "a, A, SE": { "lat": -1.25, "lng": 0 },\n' +
        '  "b, B, SE": { "lat": 2, "lng": 3.5 }\n' +
        '}\n'
    );
    expect(JSON.parse(text)).toHaveProperty(['a, A, SE', 'lat'], -1.25);
  });
});
