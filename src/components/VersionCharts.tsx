import { useMemo, useState } from 'react';

import type { DayUsage } from '../types.ts';
import { parseDate, releaseMarkers, versionColor, versionName } from '../util.ts';

import { type ChartOption, EChart } from './EChart.tsx';

const DateFormat = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

/**
 * The name of the series that only carries the release markers. It has no data of its
 * own, so that the markers stay visible regardless of which versions are shown
 */
const ReleasesSeries = 'Releases';

/**
 * A group of versions that share the same major and minor version, for example 0.19.0,
 * 0.19.1, and 0.19.2
 */
interface VersionGroup {
  /**
   * The major and minor version, for example "0.19"
   */
  name: string;

  /**
   * The versions in this group from newest to oldest
   */
  versions: string[];
}

/**
 * Groups the `versions` by their major and minor version. The builds without version
 * information are placed into a group of their own
 */
function groupVersions(versions: string[]): VersionGroup[] {
  const groups: VersionGroup[] = [];
  for (const version of versions) {
    const name =
      version === '' ? versionName(version) : version.split('.').slice(0, 2).join('.');
    const last = groups.at(-1);
    if (last?.name === name) {
      last.versions.push(version);
    } else {
      groups.push({ name, versions: [version] });
    }
  }
  return groups;
}

/**
 * Returns the percentage of all starts on each day that were of the version at `index`.
 * Days before the first and after the last start of the version are `null`, so that the
 * line only covers the time in which the version was in use
 */
function shareOfStarts(days: DayUsage[], index: number): [number, number | null][] {
  const first = days.findIndex((day) => day.counts[index] > 0);
  const last = days.findLastIndex((day) => day.counts[index] > 0);
  return days.map((day, i) => {
    const date = parseDate(day.date).getTime();
    if (i < first || i > last) return [date, null];
    const total = day.counts.reduce((acc, v) => acc + v, 0);
    return [date, (day.counts[index] / total) * 100];
  });
}

function createOption(versions: string[], days: DayUsage[]): ChartOption {
  return {
    // The legend itself is replaced by the toggles above the chart, but it is still used
    // to select which of the series are shown
    legend: { show: false },
    grid: { top: 20, left: 50, right: 30, bottom: 80 },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params) => {
        const items = (Array.isArray(params) ? params : [params])
          .map((p) => ({ p, value: (p.value as [number, number | null])[1] }))
          .filter((item) => item.value !== null && item.value > 0)
          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
        if (items.length === 0) return '';
        const date = DateFormat.format((items[0].p.value as [number, number])[0]);
        const rows = items
          .map(
            ({ p, value }) => `${p.marker}${p.seriesName}: <b>${value?.toFixed(1)}%</b>`
          )
          .join('<br>');
        return `${date}<br>${rows}`;
      }
    },
    xAxis: { type: 'time' },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value}%' }
    },
    dataZoom: [
      { type: 'inside', filterMode: 'none' },
      { type: 'slider', filterMode: 'none', bottom: 20 }
    ],
    series: [
      ...versions.map((version, i) => ({
        type: 'line' as const,
        name: versionName(version),
        showSymbol: false,
        color: versionColor(version, versions),
        lineStyle: { width: 1.5 },
        emphasis: { focus: 'series' as const },
        data: shareOfStarts(days, i)
      })),
      {
        type: 'line' as const,
        name: ReleasesSeries,
        data: [],
        markLine: releaseMarkers(days, false)
      }
    ]
  };
}

/**
 * Returns whether all, some, or none of the `versions` are hidden in the form of the
 * `aria-pressed` attribute of a toggle that shows these versions
 */
function pressedState(
  versions: string[],
  hidden: Set<string>
): 'true' | 'false' | 'mixed' {
  const count = versions.filter((v) => hidden.has(v)).length;
  if (count === 0) return 'true';
  if (count === versions.length) return 'false';
  return 'mixed';
}

interface Props {
  versions: string[];
  days: DayUsage[];
}

/**
 * Shows the percentage of all starts on each day that were of each version. Individual
 * versions and groups of versions can be hidden
 */
export function VersionCharts({ versions, days }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const groups = useMemo(() => groupVersions(versions), [versions]);
  const baseOption = useMemo(() => createOption(versions, days), [versions, days]);

  const option = useMemo<ChartOption>(() => {
    const selected: Record<string, boolean> = {};
    for (const version of versions) {
      selected[versionName(version)] = !hidden.has(version);
    }
    return { ...baseOption, legend: { show: false, selected } };
  }, [baseOption, versions, hidden]);

  /**
   * Shows all `toggled` versions if any of them is hidden, and hides them otherwise
   */
  function toggle(toggled: string[]) {
    setHidden((prev) => {
      const next = new Set(prev);
      const show = toggled.some((v) => prev.has(v));
      for (const version of toggled) {
        if (show) next.delete(version);
        else next.add(version);
      }
      return next;
    });
  }

  return (
    <div className={'version-chart'}>
      <div className={'version-toggles'} role={'group'} aria-label={'Shown versions'}>
        <div className={'version-toggles__all'}>
          <button
            type={'button'}
            disabled={hidden.size === 0}
            onClick={() => setHidden(new Set())}
          >
            Show all
          </button>
          <button
            type={'button'}
            disabled={hidden.size === versions.length}
            onClick={() => setHidden(new Set(versions))}
          >
            Hide all
          </button>
        </div>
        {groups.map((group) => (
          <div key={group.name} className={'version-toggles__group'}>
            {group.versions[0] !== '' && (
              <button
                type={'button'}
                className={'version-toggles__minor'}
                aria-pressed={pressedState(group.versions, hidden)}
                aria-label={`All ${group.name} versions`}
                onClick={() => toggle(group.versions)}
              >
                {group.name}
              </button>
            )}
            {group.versions.map((version) => (
              <button
                key={version}
                type={'button'}
                className={'version-toggles__version'}
                aria-pressed={!hidden.has(version)}
                onClick={() => toggle([version])}
              >
                <span
                  className={'version-toggles__swatch'}
                  style={{ background: versionColor(version, versions) }}
                  aria-hidden={true}
                />
                {versionName(version)}
              </button>
            ))}
          </div>
        ))}
      </div>
      <EChart option={option} merge={true} className={'chart-large'} />
    </div>
  );
}
