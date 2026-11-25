import { describe, expect, it } from 'vitest';

import { heatPoints } from './heat.ts';
import type { PlaceUsage } from './types.ts';

function place(lat: number, lng: number, byMonth: Record<string, number>): PlaceUsage {
  const total = Object.values(byMonth).reduce((a, b) => a + b, 0);
  return { lat, lng, total, byMonth };
}

const Open = { begin: null, end: null };

describe('heatPoints', () => {
  it('returns no points if there are no starts in the range', () => {
    const places = [place(1, 2, { '2024-01': 5 })];
    expect(heatPoints(places, { begin: '2025-01', end: null })).toEqual([]);
    expect(heatPoints([], Open)).toEqual([]);
  });

  it('includes only the places with starts in the range', () => {
    const places = [
      place(1, 2, { '2024-01': 5 }),
      place(3, 4, { '2024-02': 7 }),
      place(5, 6, { '2024-03': 9 })
    ];
    const points = heatPoints(places, { begin: '2024-01', end: '2024-02' });
    expect(points).toEqual([
      [1, 2, Math.pow(5 / 7, 1 / 4)],
      [3, 4, 1]
    ]);
  });

  it('gives the place with the most starts an intensity of 1', () => {
    const places = [
      place(1, 2, { '2024-01': 1 }),
      place(3, 4, { '2024-01': 100 }),
      place(5, 6, { '2024-01': 10 })
    ];
    const points = heatPoints(places, Open);
    expect(points[1]?.[2]).toBe(1);
    expect(points[0]?.[2]).toBeCloseTo(Math.pow(1 / 100, 1 / 4));
    expect(points[2]?.[2]).toBeCloseTo(Math.pow(10 / 100, 1 / 4));
  });

  it('keeps the order of the places', () => {
    const places = [
      place(50, 8, { '2024-01': 3 }),
      place(10, 20, { '2024-01': 4 }),
      place(-30, -60, { '2024-01': 5 })
    ];
    const points = heatPoints(places, Open);
    expect(points.map((p) => [p[0], p[1]])).toEqual([
      [50, 8],
      [10, 20],
      [-30, -60]
    ]);
  });
});
