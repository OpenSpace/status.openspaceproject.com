import type { UsageData } from './types.ts';
import { parseDate } from './util.ts';

/**
 * The number of days at the end of the data over which the share of the latest release
 * is computed
 */
export const RecentDays = 30;

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/**
 * Computes the headline numbers that are shown at the top of the page
 */
export function computeSummary({ days, versions, countries, places }: UsageData) {
  const lastDay = days.at(-1);
  if (lastDay === undefined) return null;

  const latestMonth = lastDay.date.substring(0, 'YYYY-MM'.length);
  const monthTotal = sum(
    days.filter((d) => d.date.startsWith(latestMonth)).map((d) => sum(d.counts))
  );

  // The latest version is the one of the most recent release. The newest version in the
  // list might be a custom build with an arbitrary version number
  const latestRelease = days.findLast((d) => d.release !== null)?.release ?? null;
  const latestIndex = latestRelease !== null ? versions.indexOf(latestRelease) : -1;
  const recentStart = parseDate(lastDay.date);
  recentStart.setDate(recentStart.getDate() - RecentDays);
  const recent = days.filter((d) => parseDate(d.date) > recentStart);
  const recentTotal = sum(recent.map((d) => sum(d.counts)));
  const latestTotal = sum(recent.map((d) => d.counts[latestIndex] ?? 0));

  return {
    lastDay: lastDay.date,
    total: sum(days.map((d) => sum(d.counts))),
    latestMonth,
    monthTotal,
    countries: countries.filter((c) => c.total > 0).length,
    places: places.length,
    latestVersion: latestIndex >= 0 ? versions[latestIndex] : null,
    latestShare: recentTotal > 0 ? (latestTotal / recentTotal) * 100 : 0
  };
}
