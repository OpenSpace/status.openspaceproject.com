import { useMemo } from 'react';

import { versionName } from '../util.ts';

import { type ChartOption, EChart } from './EChart.tsx';

interface DistributionChartProps {
  version: string;
  counts: Record<string, number>;
}

/**
 * Shows how the starts with the provided version are distributed among the `counts`
 */
function DistributionChart({ version, counts }: DistributionChartProps) {
  const option = useMemo<ChartOption>(() => {
    const data = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      title: { text: versionName(version) },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        left: '60%',
        top: 40,
        bottom: 10,
        textStyle: { width: 160, overflow: 'truncate' }
      },
      tooltip: {
        trigger: 'item',
        formatter: (p) => {
          const item = Array.isArray(p) ? p[0] : p;
          return `${item.marker}${item.name}: <b>${String(item.value)}</b> (${item.percent}%)`;
        }
      },
      series: [
        {
          type: 'pie',
          name: versionName(version),
          center: ['30%', '55%'],
          radius: '75%',
          itemStyle: { borderColor: '#0a0a0a', borderWidth: 1 },
          label: {
            position: 'inside',
            formatter: '{d}%',
            color: '#ffffff',
            fontSize: 11
          },
          labelLayout: { hideOverlap: true },
          // Labels on tiny slices would overlap, so they are only shown on hover
          minShowLabelAngle: 10,
          data
        }
      ]
    };
  }, [version, counts]);

  return <EChart option={option} className={'chart-medium'} />;
}

interface Props {
  /**
   * For each version, the number of starts per category (for example profile or
   * operating system)
   */
  distributions: Record<string, Record<string, number>>;
}

/**
 * Shows one pie chart per version with the distribution of the starts of that version
 */
export function DistributionCharts({ distributions }: Props) {
  return Object.entries(distributions).map(([version, counts]) => (
    <DistributionChart key={version} version={version} counts={counts} />
  ));
}
