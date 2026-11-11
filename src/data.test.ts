import { describe, expect, it } from 'vitest';

import { decodeUsage } from './data.ts';
import { computeSummary } from './summary.ts';
import type { UsageFile } from './types.ts';

const file: UsageFile = {
  months: ['2024-06', '2024-07'],
  versions: ['', '0.21.0', '0.20.0'],
  countries: [{ code: 'SE', name: 'Sweden', months: [0, 2, 1, 3] }],
  places: [{ lat: 58.411, lng: 15.622, months: [1, 5] }],
  days: [
    { date: '2024-06-17', versions: [2, 2] },
    { date: '2024-07-01', versions: [0, 1, 1, 3, 2, 1] }
  ],
  releases: { '2024-06-17': '0.20.0' },
  profiles: { '0.20.0': { default: 2 } }
};

describe('decodeUsage', () => {
  const data = decodeUsage(file);

  it('converts the monthly counts and computes the totals', () => {
    expect(data.countries).toEqual([
      { code: 'SE', name: 'Sweden', total: 5, byMonth: { '2024-06': 2, '2024-07': 3 } }
    ]);
    expect(data.places).toEqual([
      { lat: 58.411, lng: 15.622, total: 5, byMonth: { '2024-07': 5 } }
    ]);
  });

  it('expands the daily counts and attaches the releases', () => {
    expect(data.days).toEqual([
      { date: '2024-06-17', counts: [0, 0, 2], release: '0.20.0' },
      { date: '2024-07-01', counts: [1, 3, 1], release: null }
    ]);
  });
});

describe('computeSummary', () => {
  it('computes the headline numbers', () => {
    expect(computeSummary(decodeUsage(file))).toEqual({
      lastDay: '2024-07-01',
      total: 7,
      latestMonth: '2024-07',
      monthTotal: 5,
      countries: 1,
      places: 1,
      // The latest release, even though 0.21.0 is a newer version
      latestVersion: '0.20.0',
      // Both days lie within the last 30 days: 3 of the 7 starts were with 0.20.0
      latestShare: (3 / 7) * 100
    });
  });

  it('returns null without data', () => {
    expect(computeSummary(decodeUsage({ ...file, days: [] }))).toBeNull();
  });
});
