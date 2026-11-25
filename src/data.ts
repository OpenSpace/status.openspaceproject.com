import type {
  DayUsage,
  MonthlyCounts,
  SparseCounts,
  UsageData,
  UsageFile
} from './types.ts';

/**
 * Returns the pairs of index and count that make up the sparse counts
 */
function* sparsePairs(sparse: SparseCounts): Generator<[index: number, count: number]> {
  for (let i = 0; i + 1 < sparse.length; i += 2) {
    yield [sparse[i] ?? 0, sparse[i + 1] ?? 0];
  }
}

/**
 * Converts the sparse counts into a record that maps each of the provided `keys` that has
 * a count to that count. Returns the record and the sum of all counts.
 */
function sparseToRecord(
  sparse: SparseCounts,
  keys: string[]
): { byMonth: MonthlyCounts; total: number } {
  const byMonth: MonthlyCounts = {};
  let total = 0;
  for (const [index, count] of sparsePairs(sparse)) {
    const key = keys[index];
    if (key !== undefined) byMonth[key] = count;
    total += count;
  }
  return { byMonth, total };
}

/**
 * Converts the sparse counts into a list of `length` counts
 */
function sparseToDense(sparse: SparseCounts, length: number): number[] {
  const result = new Array<number>(length).fill(0);
  for (const [index, count] of sparsePairs(sparse)) {
    result[index] = count;
  }
  return result;
}

/**
 * Converts the compact usage file into the form that is used by the page
 */
export function decodeUsage(file: UsageFile): UsageData {
  return {
    months: file.months,
    versions: file.versions,
    countries: file.countries.map(({ code, name, months }) => ({
      code,
      name,
      ...sparseToRecord(months, file.months)
    })),
    places: file.places.map(({ lat, lng, months }) => ({
      lat,
      lng,
      ...sparseToRecord(months, file.months)
    })),
    days: file.days.map(({ date, versions }): DayUsage => ({
      date,
      counts: sparseToDense(versions, file.versions.length),
      release: file.releases[date] ?? null
    })),
    profiles: file.profiles,
    systems: file.systems
  };
}
