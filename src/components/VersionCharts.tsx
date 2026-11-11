import { useMemo } from 'react';

import type { DayUsage } from '../types.ts';
import { Colors, parseDate, versionName } from '../util.ts';

import { GoogleChart } from './GoogleChart.tsx';

interface VersionChartProps {
  days: DayUsage[];
  version: string;

  /**
   * The index of the version in the `counts` of each day
   */
  index: number;
}

/**
 * Shows the percentage of all starts on each day that were of the provided version
 */
function VersionChart({ days, version, index }: VersionChartProps) {
  const data = useMemo(
    () => [
      [
        { type: 'date', label: 'Date' },
        { type: 'number', label: 'Percentage' },
        { type: 'string', role: 'annotation' }
      ],
      ...days.map((day) => {
        const total = day.counts.reduce((acc, v) => acc + v, 0);
        return [parseDate(day.date), (day.counts[index] / total) * 100, day.release];
      })
    ],
    [days, index]
  );

  const options = useMemo(
    () => ({
      title: versionName(version),
      annotations: { style: 'line' },
      legend: 'none',
      explorer: {
        axis: 'horizontal',
        keepInBounds: true,
        maxZoomIn: 2,
        maxZoomOut: 2
      },
      series: { 0: { color: Colors[index % Colors.length] } }
    }),
    [version, index]
  );

  return (
    <GoogleChart
      type={'LineChart'}
      data={data}
      options={options}
      className={'chart-small'}
    />
  );
}

interface Props {
  versions: string[];
  days: DayUsage[];
}

export function VersionCharts({ versions, days }: Props) {
  return versions.map((version, i) => (
    <VersionChart key={version} days={days} version={version} index={i} />
  ));
}
