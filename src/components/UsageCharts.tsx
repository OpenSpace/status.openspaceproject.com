import { useMemo } from 'react';

import type { DayUsage } from '../types.ts';
import { parseDate, versionName } from '../util.ts';

import { GoogleChart } from './GoogleChart.tsx';

const Options = {
  title: 'Usage',
  bar: { groupWidth: '100%' },
  isStacked: true,
  annotations: { style: 'line' }
};

/**
 * Accumulates the per-day usage into per-month usage. All releases that happened within
 * a month are combined into a single annotation
 */
function groupByMonth(days: DayUsage[]): DayUsage[] {
  const months: DayUsage[] = [];
  for (const day of days) {
    const month = day.date.substring(0, 'YY-MM'.length);
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

function createTable(versions: string[], days: DayUsage[]): unknown[][] {
  return [
    [
      { type: 'date', label: 'Date' },
      ...versions.map((v) => ({ type: 'number', label: versionName(v) })),
      { type: 'string', role: 'annotation' }
    ],
    ...days.map((day) => [parseDate(day.date), ...day.counts, day.release])
  ];
}

interface Props {
  versions: string[];
  days: DayUsage[];
}

/**
 * Stacked charts showing the number of starts of each version per day and per month
 */
export function UsageCharts({ versions, days }: Props) {
  const daily = useMemo(() => createTable(versions, days), [versions, days]);
  const monthly = useMemo(
    () => createTable(versions, groupByMonth(days)),
    [versions, days]
  );

  return (
    <>
      <GoogleChart
        type={'ColumnChart'}
        data={daily}
        options={Options}
        className={'chart-large'}
      />
      <GoogleChart
        type={'ColumnChart'}
        data={monthly}
        options={Options}
        className={'chart-large'}
      />
    </>
  );
}
