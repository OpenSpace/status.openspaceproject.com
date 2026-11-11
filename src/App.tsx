import { useCallback, useEffect, useState } from 'react';

import { CountryMap } from './components/CountryMap.tsx';
import { MonthRangeFilter } from './components/MonthRangeFilter.tsx';
import { ProfileCharts } from './components/ProfileCharts.tsx';
import { UsageCharts } from './components/UsageCharts.tsx';
import { UsageMap } from './components/UsageMap.tsx';
import { VersionCharts } from './components/VersionCharts.tsx';
// The data is generated at build time and emitted as a separate file with a content hash
// in its name. As it changes only rarely, browsers can keep it cached across visits and
// across updates of the page itself
import usageUrl from './generated/usage.json?url';
import type { UsageData } from './types.ts';
import type { MonthRange } from './util.ts';

export function App() {
  const [data, setData] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<MonthRange>({ begin: null, end: null });

  useEffect(() => {
    const controller = new AbortController();
    fetch(usageUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load the data: ${res.status}`);
        return res.json() as Promise<UsageData>;
      })
      .then(setData)
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(String(e));
      });
    return () => controller.abort();
  }, []);

  // Only update the range if it actually changed, so that the maps are not redrawn while
  // a month is being typed
  const onRangeChange = useCallback((r: MonthRange) => {
    setRange((prev) => (prev.begin === r.begin && prev.end === r.end ? prev : r));
  }, []);

  if (error !== null) {
    return <main className={'status'}>{error}</main>;
  }
  if (data === null) {
    return <main className={'status'}>Loading…</main>;
  }

  return (
    <main>
      <h1>OpenSpace Usage</h1>

      <section>
        <h2>Usage maps</h2>
        <p>
          These maps show the places from where OpenSpace has been started. Note that the
          individual markers are only an approximation based on the <i>city</i> and do not
          represent the precise location.
        </p>
        <p>
          The maps can be filtered to a range of months. Both ends of the range are
          inclusive and an empty field means that there is no limit on that end. For
          example, setting both fields to February 2025 shows the usage in that month
          only.
        </p>
        <MonthRangeFilter onChange={onRangeChange} />
        <UsageMap places={data.places} range={range} />
        <CountryMap countries={data.countries} range={range} />
      </section>

      <section>
        <h2>Usage charts</h2>
        <UsageCharts versions={data.versions} days={data.days} />
      </section>

      <section>
        <h2>Versions</h2>
        <p>
          These graphs show for each version how large a portion of the total starts on a
          specific day were of that version. For example, if the 0.15.0 graph shows 35%
          for a specific day, 35% of the start-ups on that day were with version 0.15.0
          and 65% were with other versions.
        </p>
        <VersionCharts versions={data.versions} days={data.days} />
      </section>

      <section>
        <h2>Profiles</h2>
        <p>
          These graphs show how often each profile was started for each version. Only
          whether a <i>user profile</i> was started is collected, so it is not possible to
          show the names of individual user-created profiles. The first graph represents
          the profiles started by OpenSpace without a fixed version number (versions
          compiled from source).
        </p>
        <ProfileCharts profiles={data.profiles} />
      </section>
    </main>
  );
}
