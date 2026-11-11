import { useMemo } from 'react';

import { computeSummary, RecentDays } from '../summary.ts';
import type { UsageData } from '../types.ts';
import { parseDate } from '../util.ts';

const MonthFormat = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long' });
const DayFormat = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

interface StatProps {
  label: string;
  value: string;
  detail?: string;
}

function Stat({ label, value, detail }: StatProps) {
  return (
    <div className={'stat'}>
      <dt>{label}</dt>
      <dd>
        <span className={'stat__value'}>{value}</span>
        {detail !== undefined && <span className={'stat__detail'}>{detail}</span>}
      </dd>
    </div>
  );
}

/**
 * A row of headline numbers about the usage
 */
export function Summary({ data }: { data: UsageData }) {
  const summary = useMemo(() => computeSummary(data), [data]);
  if (summary === null) return null;

  const lastDay = DayFormat.format(parseDate(summary.lastDay));
  return (
    <dl className={'summary'}>
      <Stat
        label={'Total launches'}
        value={summary.total.toLocaleString('en')}
        detail={`Until ${lastDay}`}
      />
      <Stat
        label={`Launches in ${MonthFormat.format(parseDate(summary.latestMonth))}`}
        value={summary.monthTotal.toLocaleString('en')}
        detail={'The month might not be complete yet'}
      />
      <Stat
        label={'Countries'}
        value={summary.countries.toLocaleString('en')}
        detail={`${summary.places.toLocaleString('en')} places`}
      />
      {summary.latestVersion !== null && (
        <Stat
          label={`Share of ${summary.latestVersion}`}
          value={`${summary.latestShare.toFixed(1)}%`}
          detail={`Of the launches in the last ${RecentDays} days`}
        />
      )}
    </dl>
  );
}
