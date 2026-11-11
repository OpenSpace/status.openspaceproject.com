/**
 * Reading, validating, and writing of the `geolocation.json` file that maps each place to
 * its geographic position.
 *
 * The file is written with one place per line and sorted by the name of the place, so
 * that changes to it produce readable diffs.
 */

import fs from 'node:fs';

import type { Location } from './logdata.ts';
import { isValidLocation } from './logparse.ts';

export const GeolocationFile = 'geolocation.json';

export interface GeoPosition {
  lat: number;
  lng: number;
}

/**
 * Maps the key of a place, as created by `placeKey`, to its position
 */
export type Geolocations = Record<string, GeoPosition>;

/**
 * The number of decimals with which positions are stored. Six decimals are about 10 cm,
 * which is far more precise than the city-level positions require
 */
const Precision = 6;

/**
 * Returns the key under which the provided location is stored in the geolocation file
 */
export function placeKey(location: Location): string {
  return `${location.p.trim()}, ${location.r.trim()}, ${location.c.trim()}`;
}

/**
 * Returns `true` if the provided location can be geocoded and shown on the map
 */
export function isValidPlace(location: Location): boolean {
  return isValidLocation(location.p, location.r, location.c);
}

function round(value: number): number {
  const factor = 10 ** Precision;
  return Math.round(value * factor) / factor;
}

/**
 * Converts the positions into numbers, which older entries stored as strings, and rounds
 * them to the stored precision.
 */
export function normalizeGeolocations(raw: Record<string, unknown>): Geolocations {
  const result: Geolocations = {};
  for (const [key, value] of Object.entries(raw)) {
    const { lat, lng } = (value ?? {}) as { lat?: unknown; lng?: unknown };
    result[key] = { lat: round(Number(lat)), lng: round(Number(lng)) };
  }
  return result;
}

/**
 * Returns the list of problems with the provided geolocations. `errors` are entries that
 * cannot be used, `warnings` are entries whose key does not look like a place.
 */
export function validateGeolocations(geolocations: Geolocations): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const [key, { lat, lng }] of Object.entries(geolocations)) {
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      errors.push(`${key}: Invalid latitude ${lat}`);
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      errors.push(`${key}: Invalid longitude ${lng}`);
    }

    // The region can contain commas itself, for example "Washington, D.C."
    const parts = key.split(', ');
    const location = {
      p: parts[0],
      r: parts.slice(1, -1).join(', '),
      c: parts.at(-1) ?? ''
    };
    if (parts.length < 3 || !isValidPlace(location)) {
      warnings.push(`${key}: Does not look like 'City, Region, CountryCode'`);
    }
  }
  return { errors, warnings };
}

/**
 * Returns the contents of the geolocation file for the provided geolocations, with one
 * place per line, sorted by the key
 */
export function formatGeolocations(geolocations: Geolocations): string {
  const lines = Object.keys(geolocations)
    // Compare by code points so that the order does not depend on the locale
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((key) => {
      const { lat, lng } = geolocations[key];
      return `  ${JSON.stringify(key)}: { "lat": ${round(lat)}, "lng": ${round(lng)} }`;
    });
  return `{\n${lines.join(',\n')}\n}\n`;
}

export function readGeolocations(file = GeolocationFile): Geolocations {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  return normalizeGeolocations(raw);
}

/**
 * Writes the geolocations to the file. Throws if any of the entries is invalid, so that
 * no broken entries end up in the file.
 */
export function writeGeolocations(geolocations: Geolocations, file = GeolocationFile) {
  const { errors } = validateGeolocations(geolocations);
  if (errors.length > 0) {
    throw new Error(`Refusing to write invalid geolocations:\n${errors.join('\n')}`);
  }
  fs.writeFileSync(file, formatGeolocations(geolocations));
}
