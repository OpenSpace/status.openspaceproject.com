import type { DayUsage, MonthlyCounts } from './types.ts';

/**
 * An inclusive range of months in the form "YYYY-MM". A `null` value for either end means
 * that the range is open on that end.
 */
export interface MonthRange {
  begin: string | null;
  end: string | null;
}

/**
 * Distinct colors that are visible on the dark background
 */
const Palette = [
  '#3366cc',
  '#dc3912',
  '#ff9900',
  '#109618',
  '#990099',
  '#0099c6',
  '#dd4477',
  '#66aa00',
  '#b82e2e',
  '#316395',
  '#994499',
  '#22aa99',
  '#aaaa11',
  '#6633cc',
  '#e67300',
  '#329262',
  '#5574a6',
  '#3b3eac',
  '#b77322',
  '#16d620',
  '#b91383',
  '#f4359e',
  '#9c5935',
  '#a9c413',
  '#2a778d',
  '#668d1c',
  '#bea413',
  '#4dc9f6',
  '#f67019',
  '#537bc4',
  '#acc236',
  '#00a950',
  '#8549ba',
  '#e6194b',
  '#3cb44b',
  '#ffe119',
  '#4363d8',
  '#f58231',
  '#911eb4',
  '#46f0f0',
  '#f032e6',
  '#bcf60c',
  '#fabebe',
  '#008080',
  '#e6beff',
  '#9a6324',
  '#aaffc3',
  '#ffd8b1'
];

/**
 * Returns a random number generator that always produces the same sequence for the same
 * `seed` (mulberry32)
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a shuffled copy of the provided list. The shuffle uses a fixed seed, so that the
 * order, and therefore the colors of the versions, is the same every time the page loads
 */
function shuffle<T>(list: T[], seed: number): T[] {
  const random = seededRandom(seed);
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * The palette in a random order, so that neighboring versions get clearly different colors
 */
export const Colors = shuffle(Palette, 0x05face);

/**
 * The color of the builds without version information
 */
const NoVersionColor = '#8c9a9c';

/**
 * Returns the color of the provided `version`. The colors are assigned starting from the
 * oldest version, so that the existing versions keep their colors when a new version is
 * released. Versions only share a color if there are more versions than colors.
 *
 * @param versions The list of all versions from newest to oldest
 */
export function versionColor(version: string, versions: string[]): string {
  if (version === '') return NoVersionColor;
  const named = versions.filter((v) => v !== '');
  const age = named.length - 1 - named.indexOf(version);
  return Colors[age % Colors.length];
}

/**
 * Creates vertical marker lines labeled with the version that was released at each of
 * the `days` that have a release. If `showLabels` is `false`, the labels are only shown
 * while hovering over a line, which is useful for small charts
 */
export function releaseMarkers(
  days: { date: string; release: string | null }[],
  showLabels = true
) {
  return {
    silent: showLabels,
    symbol: 'none',
    animation: false,
    lineStyle: { color: 'rgba(232, 251, 194, 0.35)', type: 'dashed' as const, width: 1 },
    label: {
      position: 'insideEndTop' as const,
      show: showLabels,
      formatter: '{b}',
      color: '#96a4a6',
      fontSize: 10
    },
    emphasis: {
      lineStyle: { color: 'rgba(232, 251, 194, 0.8)', width: 1 },
      label: { show: true, color: '#e8fbc2' }
    },
    data: days
      .filter((day) => day.release !== null)
      .map((day) => ({ name: day.release ?? '', xAxis: parseDate(day.date).getTime() }))
  };
}

export function isRangeOpen(range: MonthRange): boolean {
  return range.begin === null && range.end === null;
}

function isInRange(month: string, range: MonthRange): boolean {
  if (range.begin !== null && month < range.begin) return false;
  if (range.end !== null && month > range.end) return false;
  return true;
}

/**
 * Returns the number of starts in `byMonth` that lie within the provided `range`.
 */
export function countInRange(
  byMonth: MonthlyCounts,
  total: number,
  range: MonthRange
): number {
  if (isRangeOpen(range)) return total;

  let sum = 0;
  for (const [month, count] of Object.entries(byMonth)) {
    if (isInRange(month, range)) sum += count;
  }
  return sum;
}

/**
 * Converts a date in the form "YYYY-MM-DD" or "YYYY-MM" into a local `Date`.
 */
export function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day ?? 1);
}

/**
 * Returns the month that lies `offset` months after the provided `month`, both in the
 * form "YYYY-MM". The `offset` can be negative
 */
export function addMonths(month: string, offset: number): string {
  const [year, m] = month.split('-').map(Number);
  const index = year * 12 + (m - 1) + offset;
  const newYear = Math.floor(index / 12);
  const newMonth = (index % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
}

export function versionName(version: string): string {
  return version === '' ? 'No version information' : version;
}

/**
 * Accumulates the per-day usage into per-month usage. All releases that happened within
 * a month are combined into a single annotation
 */
export function groupByMonth(days: DayUsage[]): DayUsage[] {
  const months: DayUsage[] = [];
  for (const day of days) {
    const month = day.date.substring(0, 'YYYY-MM'.length);
    const last = months.at(-1);
    if (last?.date === month) {
      day.counts.forEach((count, i) => (last.counts[i] += count));
      if (day.release !== null) {
        last.release =
          last.release === null ? day.release : `${last.release}, ${day.release}`;
      }
    } else {
      months.push({ date: month, counts: [...day.counts], release: day.release });
    }
  }
  return months;
}
