import { useMemo } from 'react';

import { versionName } from '../util.ts';

import { GoogleChart } from './GoogleChart.tsx';

interface ProfileChartProps {
  version: string;
  profiles: Record<string, number>;
}

/**
 * Shows how often each profile was started with the provided version
 */
function ProfileChart({ version, profiles }: ProfileChartProps) {
  const data = useMemo(
    () => [['Profile', 'Count'], ...Object.entries(profiles)],
    [profiles]
  );
  const options = useMemo(() => ({ title: versionName(version) }), [version]);

  return (
    <GoogleChart
      type={'PieChart'}
      data={data}
      options={options}
      className={'chart-medium'}
    />
  );
}

interface Props {
  profiles: Record<string, Record<string, number>>;
}

export function ProfileCharts({ profiles }: Props) {
  return Object.entries(profiles).map(([version, counts]) => (
    <ProfileChart key={version} version={version} profiles={counts} />
  ));
}
