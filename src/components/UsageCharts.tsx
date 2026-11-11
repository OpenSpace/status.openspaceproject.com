import { useMemo } from 'react';

import type { DayUsage } from '../types.ts';
import {
  groupByMonth,
  parseDate,
  releaseMarkers,
  versionColor,
  versionName
} from '../util.ts';

import { type ChartOption, EChart } from './EChart.tsx';

function createOption(
  title: string,
  versions: string[],
  days: DayUsage[],
  dateFormat: Intl.DateTimeFormatOptions
): ChartOption {
  const dates = days.map((day) => parseDate(day.date).getTime());
  const formatter = new Intl.DateTimeFormat('en', dateFormat);

  return {
    title: { text: title },
    legend: { type: 'scroll', top: 36 },
    grid: { top: 90, left: 60, right: 30, bottom: 80 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      formatter: (params) => {
        const items = (Array.isArray(params) ? params : [params]).filter(
          (p) => (p.value as [number, number])[1] > 0
        );
        if (items.length === 0) return '';
        const date = formatter.format((items[0].value as [number, number])[0]);
        const total = items.reduce((acc, p) => acc + (p.value as number[])[1], 0);
        const rows = items
          .map((p) => `${p.marker}${p.seriesName}: <b>${(p.value as number[])[1]}</b>`)
          .join('<br>');
        return `${date} (total ${total})<br>${rows}`;
      }
    },
    xAxis: { type: 'time' },
    yAxis: { type: 'value' },
    dataZoom: [
      { type: 'inside', filterMode: 'weakFilter' },
      { type: 'slider', filterMode: 'weakFilter', bottom: 20 }
    ],
    series: versions.map((version, i) => ({
      type: 'bar',
      name: versionName(version),
      color: versionColor(version, versions),
      stack: 'total',
      barCategoryGap: '0%',
      // ECharts stacks the series by data index, so every series needs a value for every
      // day, even if it is zero
      data: days.map((day, j) => [dates[j], day.counts[i]]),
      // Attach the release markers to only one of the series so that they are drawn once
      markLine: i === 0 ? releaseMarkers(days) : undefined
    }))
  };
}

interface Props {
  versions: string[];
  days: DayUsage[];
}

/**
 * Stacked charts showing the number of starts of each version per day and per month
 */
export function UsageCharts({ versions, days }: Props) {
  const daily = useMemo(
    () =>
      createOption('Usage per day', versions, days, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
    [versions, days]
  );
  const monthly = useMemo(
    () =>
      createOption('Usage per month', versions, groupByMonth(days), {
        year: 'numeric',
        month: 'long'
      }),
    [versions, days]
  );

  return (
    <>
      <EChart option={daily} className={'chart-large'} />
      <EChart option={monthly} className={'chart-large'} />
    </>
  );
}
