import { describe, expect, it } from 'vitest';

import { aggregate, sortVersions, toFullYear } from './aggregate.ts';
import type { LogData } from './logdata.ts';

describe('toFullYear', () => {
  it('adds the century', () => {
    expect(toFullYear('24-06-17 13:00:00')).toBe('2024-06-17 13:00:00');
  });
});

describe('sortVersions', () => {
  it('sorts from newest to oldest with the empty version first', () => {
    expect(sortVersions(['0.9.0', '', '0.10.1', '0.10.0', '0.21.4'])).toEqual([
      '',
      '0.21.4',
      '0.10.1',
      '0.10.0',
      '0.9.0'
    ]);
  });
});

describe('aggregate', () => {
  const data: LogData = {
    locations: [
      { p: 'Linköping', r: 'Östergötland', c: 'SE' },
      { p: 'Linkoping', r: 'Ostergotland', c: 'SE' },
      { p: 'Nowhere', r: '', c: 'US' },
      { p: '98ea3486c', r: 'Norrköping', c: 'Östergötland' },
      { p: '', r: '', c: '' },
      { p: '', r: '', c: 'US' }
    ],
    versions: ['0.20.0', '', '0.21.0'],
    systems: ['', 'Windows 10/11', 'macOS'],
    profiles: ['', 'default'],
    entries: [
      { d: '24-06-17 13:00:00', v: 0, l: 0, s: 1, p: 1 },
      { d: '24-06-17 14:00:00', v: 2, l: 1, s: 0, p: 0 },
      { d: '24-07-01 10:00:00', v: 1, l: 2, s: 2, p: 1 },
      { d: '24-07-02 10:00:00', v: 0, l: 3, s: 0, p: 1 },
      { d: '24-07-01 11:00:00', v: 1, l: 4, s: 0, p: 0 },
      { d: '24-07-01 12:00:00', v: 1, l: 5, s: 0, p: 0 }
    ]
  };
  const geolocations = {
    'Linköping, Östergötland, SE': { lat: 58.41086, lng: 15.62157 },
    // A different spelling of the same place
    'Linkoping, Ostergotland, SE': { lat: 58.4109, lng: 15.6216 }
  };
  const { usage, missing } = aggregate(data, geolocations, {
    '24-06-17': '0.20.0',
    '24-06-18': '0.21.0'
  });

  it('collects the months and versions', () => {
    expect(usage.months).toEqual(['2024-06', '2024-07']);
    expect(usage.versions).toEqual(['', '0.21.0', '0.20.0']);
  });

  it('merges places with the same position', () => {
    expect(usage.places).toEqual([{ lat: 58.411, lng: 15.622, months: [0, 2] }]);
  });

  it('counts places without a position for the countries and reports them', () => {
    expect(missing).toEqual(new Set(['Nowhere, , US']));
    expect(usage.countries).toEqual([
      { code: 'SE', name: 'Sweden', months: [0, 2] },
      { code: 'US', name: 'United States', months: [1, 2] }
    ]);
  });

  it('ignores entries with broken locations', () => {
    expect(usage.days.map((d) => d.date)).toEqual(['2024-06-17', '2024-07-01']);
  });

  it('counts entries without a place for the charts but not the maps', () => {
    // The places and `missing` above don't contain the empty and country-only locations
    expect(usage.days[1]).toEqual({ date: '2024-07-01', versions: [0, 3] });
  });

  it('stores the starts per day and version', () => {
    expect(usage.days).toEqual([
      { date: '2024-06-17', versions: [1, 1, 2, 1] },
      { date: '2024-07-01', versions: [0, 3] }
    ]);
  });

  it('only keeps the releases on days with data', () => {
    expect(usage.releases).toEqual({ '2024-06-17': '0.20.0' });
  });

  it('counts the profiles per version', () => {
    expect(usage.profiles).toEqual({ '': { default: 1 }, '0.20.0': { default: 1 } });
  });

  it('counts the operating systems per version', () => {
    expect(usage.systems).toEqual({
      '': { macOS: 1 },
      '0.20.0': { 'Windows 10/11': 1 }
    });
  });
});
