import type { MonthlyCounts } from './types.ts';

/**
 * An inclusive range of months in the form "YY-MM". A `null` value for either end means
 * that the range is open on that end.
 */
export interface MonthRange {
  begin: string | null;
  end: string | null;
}

export const Colors = [
  '#3366cc',
  '#dc3912',
  '#ff9900',
  '#109618',
  '#990099',
  '#0099c6',
  '#dd4477',
  '#66aa00',
  '#b82e2e',
  '#316395'
];

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
 * Converts a date in the form "YY-MM-DD" or "YY-MM" into a local `Date`.
 */
export function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(2000 + year, month - 1, day ?? 1);
}

export function versionName(version: string): string {
  return version === '' ? 'No version information' : version;
}
