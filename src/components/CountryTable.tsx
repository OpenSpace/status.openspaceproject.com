import { useMemo } from 'react';

import type { CountryUsage } from '../types.ts';
import { countInRange, type MonthRange } from '../util.ts';

interface Props {
  countries: CountryUsage[];
  range: MonthRange;
}

/**
 * A collapsible table with the number of starts per country, which provides the
 * information of the maps in a form that is accessible to screen readers
 */
export function CountryTable({ countries, range }: Props) {
  const rows = useMemo(() => {
    const result = countries
      .map((c) => ({ name: c.name, count: countInRange(c.byMonth, c.total, range) }))
      .filter(({ count }) => count > 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const total = result.reduce((acc, { count }) => acc + count, 0);
    return result.map((row) => ({ ...row, share: (row.count / total) * 100 }));
  }, [countries, range]);

  return (
    <details className={'country-table'}>
      <summary>
        Show the launches per country as a table ({rows.length} countries)
      </summary>
      <table>
        <thead>
          <tr>
            <th scope={'col'}>Country</th>
            <th scope={'col'}>Launches</th>
            <th scope={'col'}>Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ name, count, share }) => (
            <tr key={name}>
              <th scope={'row'}>{name}</th>
              <td>{count.toLocaleString('en')}</td>
              <td>{share.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
