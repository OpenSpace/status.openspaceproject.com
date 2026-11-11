// Aggregates the raw data.json into the much smaller usage.json that is loaded by the page.
// Places that have not been encountered before are geocoded and added to geolocation.json

import fs from 'node:fs';
import path from 'node:path';

import type { DayUsage, UsageData } from '../src/types.ts';

import { convertCountryCode } from './isocountries.ts';
import { loadData } from './logdata.ts';

interface GeoPosition {
  lat: number;
  lng: number;
}

interface GeocodeResponse {
  candidates: {
    location: { x: number; y: number };
    score: number;
  }[];
}

interface ReleaseData {
  /**
   * Maps the date of a release in the form "YY-MM-DD" to the released version
   */
  dates: Record<string, string>;
}

/**
 * Maps a key to the number of times it has been encountered
 */
type Counter = Record<string, number>;

/**
 * The file into which the aggregated data is written. It is imported by the page
 */
const OutputFile = 'src/generated/usage.json';

const Geolocation = JSON.parse(fs.readFileSync('geolocation.json', 'utf8')) as Record<
  string,
  GeoPosition
>;
const Releases = JSON.parse(fs.readFileSync('releases.json', 'utf8')) as ReleaseData;

function increaseCount(obj: Counter, key: string) {
  obj[key] = (obj[key] ?? 0) + 1;
}

function sum(obj: Counter): number {
  return Object.values(obj).reduce((acc, v) => acc + v, 0);
}

/**
 * Looks up the geographic position of the provided `place` using the ArcGIS geocoding
 * service and stores the result in the geolocation.json file.
 */
async function geocode(place: string, row: number) {
  const res = await fetch(
    `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(place)}&category=&outFields=*&forStorage=false&f=json`
  );

  if (!res.ok) {
    console.log(`Geocoding failed for ${place}: ${res.status}`);
    return;
  }

  const j = (await res.json()) as GeocodeResponse;
  if (j.candidates.length !== 1) {
    // If we get more than one hit, we want to sort them and pick the best hit
    j.candidates = j.candidates.sort((a, b) => b.score - a.score);

    j.candidates.forEach((e) => console.log(e.location, e.score));
    if (j.candidates.length === 0 || j.candidates[0].score < 75) {
      throw new Error(
        `Expected 1 result for geolocation in row ${row}: (${place}), got ${j.candidates.length}`
      );
    }
  }

  Geolocation[place] = {
    lat: j.candidates[0].location.y,
    lng: j.candidates[0].location.x
  };
  fs.writeFileSync('geolocation.json', JSON.stringify(Geolocation));
  console.log(place, j.candidates[0].location);
}

/**
 * Sorts the versions from newest to oldest, with the empty version (builds that don't
 * have a version number) first.
 */
function sortVersions(versions: Iterable<string>): string[] {
  return [...versions].sort((a, b) => {
    if (a === '' || b === '') return a === '' ? -1 : 1;
    return b.localeCompare(a, 'en', { numeric: true });
  });
}

async function generateData(): Promise<UsageData> {
  const data = await loadData();

  // Country -> Month -> count
  const countries: Record<string, Counter> = {};
  // Place -> Month -> count
  const places: Record<string, Counter> = {};
  // Day -> Version -> count
  const days: Record<string, Counter> = {};
  // Version -> Profile -> count
  const profiles: Record<string, Counter> = {};

  for (let i = 0; i < data.entries.length; i += 1) {
    const entry = data.entries[i];
    const version = data.versions[entry.v];
    const location = data.locations[entry.l];
    const profile = data.profiles[entry.p];

    const city = location.p.trim();
    const country = location.c;
    if (city.length === 0 || country.length === 0) continue;

    const place = `${city}, ${location.r}, ${country}`;
    if (!(place in Geolocation)) {
      await geocode(place, i);
    }

    if (profile !== '') {
      increaseCount((profiles[version] ??= {}), profile);
    }

    const month = entry.d.substring(0, 'YY-MM'.length);
    increaseCount((places[place] ??= {}), month);
    increaseCount((countries[country] ??= {}), month);

    const day = entry.d.substring(0, 'YY-MM-DD'.length);
    increaseCount((days[day] ??= {}), version);
  }

  const versions = sortVersions(new Set(Object.values(days).flatMap(Object.keys)));

  return {
    versions,
    countries: Object.entries(countries).map(([code, byMonth]) => ({
      code,
      name: convertCountryCode(code),
      total: sum(byMonth),
      byMonth
    })),
    places: Object.entries(places)
      // Places whose geocoding failed are skipped
      .filter(([place]) => place in Geolocation)
      .map(([place, byMonth]) => ({
        lat: Geolocation[place].lat,
        lng: Geolocation[place].lng,
        total: sum(byMonth),
        byMonth
      })),
    days: Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]): DayUsage => ({
        date,
        counts: versions.map((v) => counts[v] ?? 0),
        release: Releases.dates[date] ?? null
      })),
    profiles: Object.fromEntries(
      versions.filter((v) => v in profiles).map((v) => [v, profiles[v]])
    )
  };
}

//
// main
const usage = await generateData();
fs.mkdirSync(path.dirname(OutputFile), { recursive: true });
fs.writeFileSync(OutputFile, JSON.stringify(usage));
console.log(`Wrote ${OutputFile}`);
