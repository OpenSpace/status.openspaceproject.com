import type { PlaceUsage } from './types.ts';
import { countInRange, type MonthRange } from './util.ts';

/**
 * A point for the heat layer: latitude, longitude, and the intensity of the point
 */
export type HeatPoint = [number, number, number];

/**
 * The power used to compress the intensities, so that places with few starts remain
 * visible next to the hot spots. The country map uses the same compression
 */
const IntensityPower = 1 / 4;

/**
 * Returns the heat points for all places with starts in the given month range. The
 * intensity of a point is the number of starts at the place, compressed so that the
 * place with the most starts has an intensity of 1
 */
export function heatPoints(places: PlaceUsage[], range: MonthRange): HeatPoint[] {
  const counted = places.map((place) => ({
    place,
    count: countInRange(place.byMonth, place.total, range)
  }));
  let max = 0;
  for (const { count } of counted) {
    if (count > max) max = count;
  }
  if (max === 0) return [];

  return counted
    .filter(({ count }) => count > 0)
    .map(({ place, count }): HeatPoint => [
      place.lat,
      place.lng,
      Math.pow(count / max, IntensityPower)
    ]);
}
