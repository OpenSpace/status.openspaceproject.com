import { registerMap } from 'echarts/core';
import { useEffect, useMemo, useState } from 'react';

import worldUrl from '../generated/world.json?url';
import type { CountryUsage } from '../types.ts';
import { countInRange, type MonthRange } from '../util.ts';

import { type ChartOption, EChart } from './EChart.tsx';

interface WorldMap {
  features: { properties: { name: string; title: string } }[];
}

/**
 * Loads the country outlines and registers them with ECharts. Returns the names of the
 * countries by their ISO code. The loading starts as soon as this module is loaded
 */
const countryTitles: Promise<Map<string, string>> = fetch(worldUrl)
  .then((res) => {
    if (!res.ok) throw new Error(`Failed to load the map: ${res.status}`);
    return res.json() as Promise<WorldMap>;
  })
  .then((map) => {
    registerMap('world', map as unknown as Parameters<typeof registerMap>[1]);
    return new Map(map.features.map((f) => [f.properties.name, f.properties.title]));
  });

const Colors = ['#123544', '#3dbdee', '#e8fbc2'];

/**
 * The French overseas departments have their own country codes in the usage data, but
 * are part of France's outline in the map data, so their launches are counted as France
 */
const MergedCountries: Record<string, string> = {
  GF: 'FR', // French Guiana
  GP: 'FR', // Guadeloupe
  MQ: 'FR', // Martinique
  RE: 'FR', // Réunion
  YT: 'FR' // Mayotte
};

interface Props {
  countries: CountryUsage[];
  range: MonthRange;
}

/**
 * A map that colors each country by the number of times OpenSpace has been started there
 */
export function CountryMap({ countries, range }: Props) {
  const [titles, setTitles] = useState<Map<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    countryTitles.then(
      (t) => !cancelled && setTitles(t),
      (e: unknown) => !cancelled && setError(String(e))
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const option = useMemo<ChartOption | null>(() => {
    if (titles === null) return null;

    const counts = new Map<string, number>();
    for (const country of countries) {
      const code = MergedCountries[country.code] ?? country.code;
      const count = countInRange(country.byMonth, country.total, range);
      counts.set(code, (counts.get(code) ?? 0) + count);
    }
    const data = [...counts]
      .filter(([, count]) => count > 0)
      .map(([code, count]) => ({ code, name: titles.get(code) ?? code, count }));
    const max = Math.max(1, ...data.map(({ count }) => count));

    return {
      tooltip: {
        trigger: 'item',
        formatter: (p) => {
          const item = Array.isArray(p) ? p[0] : p;
          const d = item.data as { count?: number; title?: string } | undefined;
          const title = d?.title ?? titles.get(item.name) ?? item.name;
          if (d?.count === undefined) return title;
          const s = d.count === 1 ? '' : 'es';
          return `${title}: <b>${d.count.toLocaleString('en')}</b> launch${s}`;
        }
      },
      visualMap: {
        type: 'continuous',
        show: false,
        min: 0,
        max: 1,
        inRange: { color: Colors }
      },
      series: [
        {
          type: 'map',
          map: 'world',
          name: 'Launches per country',
          // Show the whole globe in an equirectangular 2:1 aspect ratio. By default ECharts
          // fits the map to the extent of the outlines and compresses it horizontally
          boundingCoords: [
            [-180, 90],
            [180, -90]
          ],
          aspectScale: 1,
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          itemStyle: {
            areaColor: '#1c2228',
            borderColor: 'rgba(184, 200, 202, 0.25)',
            borderWidth: 0.5
          },
          emphasis: {
            label: { show: false },
            itemStyle: { areaColor: '#a2e7fb', borderColor: '#ffffff', borderWidth: 1 }
          },
          select: { disabled: true },
          data: data.map(({ code, name, count }) => ({
            name: code,
            title: name,
            // Compress the range of values so that countries with few starts remain visible
            value: Math.pow(count / max, 1 / 4),
            count
          }))
        }
      ]
    };
  }, [countries, range, titles]);

  if (error !== null) {
    return <div className={'country-map chart-error'}>{error}</div>;
  }
  if (option === null) {
    return <div className={'country-map skeleton'} />;
  }
  return <EChart option={option} className={'country-map'} />;
}
