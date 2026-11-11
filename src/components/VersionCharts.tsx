import { useMemo } from 'react';

import type { DayUsage } from '../types.ts';
import { parseDate, releaseMarkers, versionColor, versionName } from '../util.ts';

import { type ChartOption, EChart } from './EChart.tsx';

const DateFormat = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

interface VersionChartProps {
  days: DayUsage[];
  version: string;

  /**
   * The index of the version in the `counts` of each day
   */
  index: number;

  color: string;
}

/**
 * Shows the percentage of all starts on each day that were of the provided version
 */
function VersionChart({ days, version, index, color }: VersionChartProps) {
  const option = useMemo<ChartOption>(
    () => ({
      title: { text: versionName(version) },
      grid: { top: 40, left: 50, right: 30, bottom: 30 },
      tooltip: {
        trigger: 'axis',
        confine: true,
        valueFormatter: (v) => `${Number(v).toFixed(1)}%`,
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0] : params;
          const [date, value] = p.value as [number, number];
          return `${DateFormat.format(date)}<br>${p.marker}<b>${value.toFixed(1)}%</b>`;
        }
      },
      xAxis: { type: 'time' },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { formatter: '{value}%' }
      },
      dataZoom: [{ type: 'inside', filterMode: 'none' }],
      series: [
        {
          type: 'line',
          name: versionName(version),
          showSymbol: false,
          color,
          lineStyle: { width: 1.5 },
          data: days.map((day) => {
            const total = day.counts.reduce((acc, v) => acc + v, 0);
            return [parseDate(day.date).getTime(), (day.counts[index] / total) * 100];
          }),
          markLine: releaseMarkers(days, false)
        }
      ]
    }),
    [days, version, index, color]
  );

  return <EChart option={option} className={'chart-small'} />;
}

interface Props {
  versions: string[];
  days: DayUsage[];
}

export function VersionCharts({ versions, days }: Props) {
  return versions.map((version, i) => (
    <VersionChart
      key={version}
      days={days}
      version={version}
      index={i}
      color={versionColor(version, versions)}
    />
  ));
}
