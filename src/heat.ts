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
  const counts = places.map((place) => countInRange(place.byMonth, place.total, range));
  let max = 0;
  for (const count of counts) {
    if (count > max) max = count;
  }
  if (max === 0) return [];

  const points: HeatPoint[] = [];
  for (let i = 0; i < places.length; i++) {
    if (counts[i] > 0) {
      points.push([
        places[i].lat,
        places[i].lng,
        Math.pow(counts[i] / max, IntensityPower)
      ]);
    }
  }
  return points;
}
