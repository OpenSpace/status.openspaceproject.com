/**
 * Aggregates the raw data.json into the much smaller usage.json that is loaded by the page
 */

import type { SparseCounts, UsageFile } from '../src/types.ts';

import { type Geolocations, isValidPlace, placeKey } from './geolocation.ts';
import { convertCountryCode } from './isocountries.ts';
import type { LogData } from './logdata.ts';
import { isAcceptableLocation } from './logparse.ts';

/**
 * Maps a key to the number of times it has been encountered
 */
type Counter = Map<string, number>;

/**
 * The number of decimals of the positions of places in the usage file. Three decimals are
 * about 100 m, which is more than precise enough for city-level positions
 */
const PositionPrecision = 3;

function increaseCount(counter: Counter, key: string, amount = 1) {
  counter.set(key, (counter.get(key) ?? 0) + amount);
}

function getOrCreate<K, V>(map: Map<K, V>, key: K, create: () => V): V {
  let value = map.get(key);
  if (value === undefined) {
    value = create();
    map.set(key, value);
  }
  return value;
}

/**
 * Converts a date from the log files, which starts with a two-digit year "YY-MM-DD", into
 * a date with a four-digit year "YYYY-MM-DD". All dates in the log files are from the
 * 21st century
 */
export function toFullYear(date: string): string {
  return `20${date}`;
}

/**
 * Sorts the versions from newest to oldest, with the empty version (builds that don't
 * have a version number) first.
 */
export function sortVersions(versions: Iterable<string>): string[] {
  return [...versions].sort((a, b) => {
    if (a === '' || b === '') return a === '' ? -1 : b === '' ? 1 : 0;
    return b.localeCompare(a, 'en', { numeric: true });
  });
}

/**
 * Converts the counter into the sparse representation, using the indices of the keys in
 * the provided `keys` list
 */
function toSparse(counter: Counter, keys: Map<string, number>): SparseCounts {
  return [...counter]
    .map(([key, count]) => [keys.get(key) ?? -1, count])
    .sort(([a], [b]) => a - b)
    .flat();
}

function indexMap(list: string[]): Map<string, number> {
  return new Map(list.map((v, i) => [v, i]));
}

/**
 * Aggregates the entries of the raw `data` into the usage file. Entries without a place,
 * for example because only the country or no location at all could be determined, and
 * places that don't have a position in `geolocations` are left out of the maps, but are
 * still counted for the countries (if known) and charts. Entries with a broken location
 * are ignored entirely. The returned `missing` set contains the valid places without a
 * position.
 *
 * @param releases Maps the date of a release in the form "YY-MM-DD" to the version
 */
export function aggregate(
  data: LogData,
  geolocations: Geolocations,
  releases: Record<string, string>
): { usage: UsageFile; missing: Set<string> } {
  // Country -> Month -> count
  const countries = new Map<string, Counter>();
  // Position -> Month -> count. Different spellings of a place have the same position
  const places = new Map<string, Counter>();
  // Day -> Version -> count
  const days = new Map<string, Counter>();
  // Version -> Profile -> count
  const profiles = new Map<string, Counter>();
  // Version -> Operating system -> count
  const systems = new Map<string, Counter>();
  const missing = new Set<string>();

  for (const entry of data.entries) {
    const version = data.versions[entry.v];
    const location = data.locations[entry.l];
    const profile = data.profiles[entry.p];
    const system = data.systems[entry.s];
    if (!isAcceptableLocation(location.p, location.r, location.c)) continue;

    const date = toFullYear(entry.d);
    const month = date.substring(0, 'YYYY-MM'.length);
    const day = date.substring(0, 'YYYY-MM-DD'.length);

    if (isValidPlace(location)) {
      const place = placeKey(location);
      const position = geolocations[place];
      if (position !== undefined) {
        const key = `${position.lat.toFixed(PositionPrecision)},${position.lng.toFixed(PositionPrecision)}`;
        increaseCount(
          getOrCreate(places, key, () => new Map()),
          month
        );
      } else {
        missing.add(place);
      }
    }

    const country = location.c.trim();
    if (country !== '') {
      increaseCount(
        getOrCreate(countries, country, () => new Map()),
        month
      );
    }
    increaseCount(
      getOrCreate(days, day, () => new Map()),
      version
    );
    if (profile !== '') {
      increaseCount(
        getOrCreate(profiles, version, () => new Map()),
        profile
      );
    }
    if (system !== '') {
      increaseCount(
        getOrCreate(systems, version, () => new Map()),
        system
      );
    }
  }

  const versions = sortVersions(
    new Set([...days.values()].flatMap((c) => [...c.keys()]))
  );
  const versionIndices = indexMap(versions);
  const months = [
    ...new Set([...countries.values()].flatMap((c) => [...c.keys()]))
  ].sort();
  const monthIndices = indexMap(months);
  const sortedDays = [...days.keys()].sort();

  // Converts the per-version counters into records, ordered from newest to oldest version
  const perVersion = (counters: Map<string, Counter>) =>
    Object.fromEntries(
      versions
        .filter((v) => counters.has(v))
        .map((v) => [v, Object.fromEntries(counters.get(v) ?? [])])
    );

  const usage: UsageFile = {
    months,
    versions,
    countries: [...countries]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, byMonth]) => ({
        code,
        name: convertCountryCode(code),
        months: toSparse(byMonth, monthIndices)
      })),
    places: [...places]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, byMonth]) => {
        const [lat, lng] = key.split(',').map(Number);
        return { lat, lng, months: toSparse(byMonth, monthIndices) };
      }),
    days: sortedDays.map((date) => ({
      date,
      versions: toSparse(days.get(date) ?? new Map(), versionIndices)
    })),
    releases: Object.fromEntries(
      Object.entries(releases)
        .map(([date, version]) => [toFullYear(date), version])
        .filter(([date]) => days.has(date))
    ),
    profiles: perVersion(profiles),
    systems: perVersion(systems)
  };

  return { usage, missing };
}
