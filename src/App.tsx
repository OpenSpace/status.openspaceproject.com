import { lazy, type ReactNode, Suspense, useCallback, useEffect, useState } from 'react';

import { CountryTable } from './components/CountryTable.tsx';
import { MonthRangeFilter } from './components/MonthRangeFilter.tsx';
import { type NavSection, SectionNav } from './components/SectionNav.tsx';
import { Summary } from './components/Summary.tsx';
import { UsageMap } from './components/UsageMap.tsx';
// The data is generated at build time and emitted as a separate file with a content hash
// in its name. As it changes only rarely, browsers can keep it cached across visits and
// across updates of the page itself
import usageUrl from './generated/usage.json?url';
import { decodeUsage } from './data.ts';
import type { UsageData, UsageFile } from './types.ts';
import type { MonthRange } from './util.ts';

// The charts are loaded on demand, so that the page and the usage map can be shown while
// the charting library is still loading
const CountryMap = lazy(() =>
  import('./components/CountryMap.tsx').then((m) => ({ default: m.CountryMap }))
);
const UsageCharts = lazy(() =>
  import('./components/UsageCharts.tsx').then((m) => ({ default: m.UsageCharts }))
);
const VersionCharts = lazy(() =>
  import('./components/VersionCharts.tsx').then((m) => ({ default: m.VersionCharts }))
);
const DistributionCharts = lazy(() =>
  import('./components/DistributionCharts.tsx').then((m) => ({
    default: m.DistributionCharts
  }))
);

const Sections: NavSection[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'maps', label: 'Usage maps' },
  { id: 'usage', label: 'Usage charts' },
  { id: 'versions', label: 'Versions' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'systems', label: 'Operating systems' }
];

function PageHeader() {
  return (
    <header className={'page-header'}>
      <p className={'page-header__eyebrow'}>OpenSpace Status</p>
      <h1>OpenSpace Usage</h1>
    </header>
  );
}

/**
 * A placeholder that is shown while the content is loading
 */
function Skeleton({ className, count = 1 }: { className: string; count?: number }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className={`skeleton ${className}`} aria-hidden={true} />
  ));
}

function LoadingPage() {
  return (
    <main aria-busy={true}>
      <PageHeader />
      <p className={'visually-hidden'} role={'status'}>
        Loading the usage data…
      </p>
      <section className={'content-section'}>
        <div className={'summary'}>
          <Skeleton className={'stat-skeleton'} count={4} />
        </div>
      </section>
      <section className={'content-section'}>
        <div className={'maps'}>
          <Skeleton className={'usage-map'} count={2} />
        </div>
      </section>
    </main>
  );
}

function ErrorPage({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <main>
      <PageHeader />
      <section className={'content-section error'} role={'alert'}>
        <h2>The usage data could not be loaded</h2>
        <p>
          This might be a temporary problem with the network or the server. Please try
          again in a moment.
        </p>
        <p className={'error__details'}>{error}</p>
        <button type={'button'} className={'button'} onClick={onRetry}>
          Try again
        </button>
      </section>
    </main>
  );
}

function Lazy({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

export function App() {
  const [data, setData] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [range, setRange] = useState<MonthRange>({ begin: null, end: null });

  useEffect(() => {
    const controller = new AbortController();
    fetch(usageUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
        return res.json() as Promise<UsageFile>;
      })
      .then((file) => setData(decodeUsage(file)))
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((a) => a + 1);
  }, []);

  // Only update the range if it actually changed, so that the maps are not redrawn while
  // a month is being typed
  const onRangeChange = useCallback((r: MonthRange) => {
    setRange((prev) => (prev.begin === r.begin && prev.end === r.end ? prev : r));
  }, []);

  if (error !== null) return <ErrorPage error={error} onRetry={retry} />;
  if (data === null) return <LoadingPage />;

  return (
    <main>
      <PageHeader />
      <SectionNav sections={Sections} />

      <section id={'summary'} className={'content-section'} aria-label={'Summary'}>
        <Summary data={data} />
      </section>

      <section id={'maps'} className={'content-section'}>
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
        <MonthRangeFilter
          latestMonth={data.months.at(-1) ?? ''}
          onChange={onRangeChange}
        />
        <div className={'maps'}>
          <UsageMap places={data.places} range={range} />
          <Lazy fallback={<Skeleton className={'country-map'} />}>
            <CountryMap countries={data.countries} range={range} />
          </Lazy>
        </div>
        <CountryTable countries={data.countries} range={range} />
      </section>

      <section id={'usage'} className={'content-section'}>
        <h2>Usage charts</h2>
        <div className={'chart-stack'}>
          <Lazy fallback={<Skeleton className={'chart-large'} count={2} />}>
            <UsageCharts versions={data.versions} days={data.days} />
          </Lazy>
        </div>
      </section>

      <section id={'versions'} className={'content-section'}>
        <h2>Versions</h2>
        <p>
          This graph shows for each version how large a portion of the total starts on a
          specific day were of that version. For example, if the 0.15.0 line shows 35% for
          a specific day, 35% of the start-ups on that day were with version 0.15.0 and
          65% were with other versions.
        </p>
        <p>
          Individual versions can be shown or hidden with the buttons above the graph. The
          buttons with only a minor version, such as 0.19, show or hide all versions of
          that minor version at once.
        </p>
        <Lazy fallback={<Skeleton className={'chart-large'} />}>
          <VersionCharts versions={data.versions} days={data.days} />
        </Lazy>
      </section>

      <section id={'profiles'} className={'content-section'}>
        <h2>Profiles</h2>
        <p>
          These graphs show how often each profile was started for each version. Only
          whether a <i>user profile</i> was started is collected, so it is not possible to
          show the names of individual user-created profiles. The first graph represents
          the profiles started by OpenSpace without a fixed version number (versions
          compiled from source).
        </p>
        <div className={'chart-grid'}>
          <Lazy
            fallback={
              <Skeleton
                className={'chart-medium'}
                count={Object.keys(data.profiles).length}
              />
            }
          >
            <DistributionCharts distributions={data.profiles} />
          </Lazy>
        </div>
      </section>

      <section id={'systems'} className={'content-section'}>
        <h2>Operating systems</h2>
        <p>
          These graphs show on which operating systems each version was started. Older
          versions of OpenSpace did not report the operating system, so they are not
          included. OpenSpace currently only reports the operating system on Windows, so
          starts of version 0.20.0 and newer without an operating system are shown as
          unknown, which are most likely Linux or macOS.
        </p>
        <div className={'chart-grid'}>
          <Lazy
            fallback={
              <Skeleton
                className={'chart-medium'}
                count={Object.keys(data.systems).length}
              />
            }
          >
            <DistributionCharts distributions={data.systems} />
          </Lazy>
        </div>
      </section>
    </main>
  );
}
