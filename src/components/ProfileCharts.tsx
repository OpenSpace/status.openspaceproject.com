import { useMemo } from 'react';

import { versionName } from '../util.ts';

import { type ChartOption, EChart } from './EChart.tsx';

interface ProfileChartProps {
  version: string;
  profiles: Record<string, number>;
}

/**
 * Shows how often each profile was started with the provided version
 */
function ProfileChart({ version, profiles }: ProfileChartProps) {
  const option = useMemo<ChartOption>(() => {
    const data = Object.entries(profiles)
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
  }, [version, profiles]);

  return <EChart option={option} className={'chart-medium'} />;
}

interface Props {
  profiles: Record<string, Record<string, number>>;
}

export function ProfileCharts({ profiles }: Props) {
  return Object.entries(profiles).map(([version, counts]) => (
    <ProfileChart key={version} version={version} profiles={counts} />
  ));
}
