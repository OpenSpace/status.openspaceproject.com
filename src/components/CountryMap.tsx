import { useMemo } from 'react';

import type { CountryUsage } from '../types.ts';
import { countInRange, type MonthRange } from '../util.ts';

import { GoogleChart } from './GoogleChart.tsx';

const Options = {
  colorAxis: { colors: ['#ccedff', '#005985'] },
  legend: 'none'
};

interface Props {
  countries: CountryUsage[];
  range: MonthRange;
}

/**
 * A map that colors each country by the number of times OpenSpace has been started there
 */
export function CountryMap({ countries, range }: Props) {
  const data = useMemo(() => {
    const counts = countries.map((c) => countInRange(c.byMonth, c.total, range));
    const max = Math.max(1, ...counts);

    return [
      ['Country', 'Usage'],
      ...countries.map((country, i) => [
        { v: country.code, f: country.name },
        // Compress the range of values so that countries with few starts remain visible
        { v: Math.pow(counts[i] / max, 1 / 4), f: counts[i].toLocaleString('en') }
      ])
    ];
  }, [countries, range]);

  return <GoogleChart type={'GeoChart'} data={data} options={Options} />;
}
