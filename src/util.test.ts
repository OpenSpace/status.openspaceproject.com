import { describe, expect, it } from 'vitest';

import type { DayUsage } from './types.ts';
import {
  addMonths,
  Colors,
  countInRange,
  groupByMonth,
  parseDate,
  versionColor
} from './util.ts';

describe('parseDate', () => {
  it('parses days and months', () => {
    expect(parseDate('2024-06-17')).toEqual(new Date(2024, 5, 17));
    expect(parseDate('2024-06')).toEqual(new Date(2024, 5, 1));
  });
});

describe('addMonths', () => {
  it('moves across year boundaries', () => {
    expect(addMonths('2024-11', 2)).toBe('2025-01');
    expect(addMonths('2024-01', -1)).toBe('2023-12');
    expect(addMonths('2024-06', -11)).toBe('2023-07');
    expect(addMonths('2024-06', 0)).toBe('2024-06');
  });
});

describe('countInRange', () => {
  const byMonth = { '2024-01': 1, '2024-02': 2, '2024-03': 4 };

  it('returns the total for an open range', () => {
    expect(countInRange(byMonth, 7, { begin: null, end: null })).toBe(7);
  });

  it('includes both ends of the range', () => {
    expect(countInRange(byMonth, 7, { begin: '2024-02', end: '2024-03' })).toBe(6);
    expect(countInRange(byMonth, 7, { begin: '2024-02', end: '2024-02' })).toBe(2);
  });

  it('supports ranges that are open on one end', () => {
    expect(countInRange(byMonth, 7, { begin: '2024-02', end: null })).toBe(6);
    expect(countInRange(byMonth, 7, { begin: null, end: '2024-01' })).toBe(1);
  });
});

describe('groupByMonth', () => {
  it('sums the counts and combines the releases of each month', () => {
    const days: DayUsage[] = [
      { date: '2024-06-01', counts: [1, 2], release: null },
      { date: '2024-06-17', counts: [3, 4], release: '0.20.0' },
      { date: '2024-06-30', counts: [0, 1], release: '0.20.1' },
      { date: '2024-07-01', counts: [5, 0], release: null }
    ];
    expect(groupByMonth(days)).toEqual([
      { date: '2024-06', counts: [4, 7], release: '0.20.0, 0.20.1' },
      { date: '2024-07', counts: [5, 0], release: null }
    ]);
    // The input is not modified
    expect(days[0].counts).toEqual([1, 2]);
  });
});

describe('versionColor', () => {
  const versions = ['', ...Array.from({ length: 33 }, (_, i) => `0.${33 - i}.0`)];

  it('gives every version a different color', () => {
    const colors = versions.map((v) => versionColor(v, versions));
    expect(new Set(colors).size).toBe(versions.length);
  });

  it('keeps the colors of existing versions when a new version is released', () => {
    const newVersions = ['', '0.34.0', ...versions.slice(1)];
    for (const v of versions) {
      expect(versionColor(v, newVersions)).toBe(versionColor(v, versions));
    }
  });

  it('uses each color of the palette only once', () => {
    expect(new Set(Colors).size).toBe(Colors.length);
  });
});
