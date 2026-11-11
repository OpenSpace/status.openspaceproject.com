/**
 * Creates the GeoJSON with the country outlines that is used by the country map. The
 * outlines come from the Natural Earth data of the `world-atlas` package, which
 * identifies countries by their ISO 3166-1 numeric code. They are converted into the
 * alpha-2 codes that are used in the usage data.
 */

import fs from 'node:fs';
import { createRequire } from 'node:module';
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';
import countries from 'i18n-iso-countries';
import { feature, merge } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

/**
 * The properties of each feature. `name` is the alpha-2 code, which is what ECharts uses
 * to match the data to the regions, and `title` is the human-readable name
 */
export interface CountryProperties {
  name: string;
  title: string;
}

/**
 * Areas that do not have a numeric code in the data, mapped to the alpha-2 code of the
 * country that they are shown as
 */
const Unnumbered: Record<string, string> = {
  Kosovo: 'XK',
  'N. Cyprus': 'CY',
  Somaliland: 'SO'
};

/**
 * Antarctica takes a lot of space at the bottom of the map without providing any value
 */
const Excluded = new Set(['AQ']);

/**
 * The number of decimals of the coordinates. Two decimals are about 1 km, which is more
 * precise than the 1:110m outlines
 */
const Precision = 2;

/**
 * ECharts does not handle areas that cross the antimeridian (180° longitude), for example
 * the eastern tip of Russia or Fiji, and draws a line across the whole map for them.
 * Therefore the points of such a ring that lie on the other side of the antimeridian are
 * moved onto it, which only affects a very small area.
 */
function fixAntimeridian(ring: Position[]): Position[] {
  const crosses = ring.some((p, i) => i > 0 && Math.abs(p[0] - ring[i - 1][0]) > 180);
  if (!crosses) return ring;

  const east = ring.filter((p) => p[0] > 0).length >= ring.length / 2;
  return ring.map(([lng, lat]) => {
    if (east && lng < 0) return [180, lat];
    if (!east && lng > 0) return [-180, lat];
    return [lng, lat];
  });
}

function fixRing(ring: Position[]): Position[] {
  const factor = 10 ** Precision;
  return fixAntimeridian(ring).map((p) => p.map((v) => Math.round(v * factor) / factor));
}

function fixGeometry(geometry: Geometry): Geometry {
  switch (geometry.type) {
    case 'Polygon':
      return { ...geometry, coordinates: geometry.coordinates.map(fixRing) };
    case 'MultiPolygon':
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((p) => p.map(fixRing))
      };
    default:
      return geometry;
  }
}

type CountryTopology = Topology<{ countries: GeometryCollection<{ name: string }> }>;
type CountryGeometry = CountryTopology['objects']['countries']['geometries'][number];

function readTopology(file: string): CountryTopology {
  const require = createRequire(import.meta.url);
  return JSON.parse(fs.readFileSync(require.resolve(file), 'utf8')) as CountryTopology;
}

function nameOf(geometry: CountryGeometry): string | undefined {
  return (geometry.properties as { name?: string } | undefined)?.name;
}

/**
 * Returns the features of all countries in the topology by their alpha-2 code
 */
function countryFeatures(
  topology: CountryTopology
): Map<string, Feature<Geometry, CountryProperties>> {
  // Group the geometries by country, as some countries consist of multiple areas
  const byCode = new Map<string, CountryGeometry[]>();
  for (const geometry of topology.objects.countries.geometries) {
    const code =
      geometry.id !== undefined
        ? countries.numericToAlpha2(String(geometry.id))
        : Unnumbered[nameOf(geometry) ?? ''];
    if (code === undefined || Excluded.has(code)) continue;
    byCode.set(code, [...(byCode.get(code) ?? []), geometry]);
  }

  const result = new Map<string, Feature<Geometry, CountryProperties>>();
  for (const [code, geometries] of byCode) {
    const title =
      geometries.length === 1
        ? (nameOf(geometries[0]) ?? code)
        : (countries.getName(code, 'en') ?? code);
    const geometry =
      geometries.length === 1
        ? (feature(topology, geometries[0]) as Feature<Geometry>).geometry
        : merge(topology, geometries as Parameters<typeof merge>[1]);
    result.set(code, {
      type: 'Feature',
      properties: { name: code, title },
      geometry: fixGeometry(geometry)
    });
  }
  return result;
}

/**
 * Returns the outlines of all countries. Small countries, for example Singapore or Malta,
 * are not part of the 1:110m data, so they are taken from the more detailed 1:50m data
 */
export function createWorldMap(): FeatureCollection<Geometry, CountryProperties> {
  const coarse = countryFeatures(readTopology('world-atlas/countries-110m.json'));
  const detailed = countryFeatures(readTopology('world-atlas/countries-50m.json'));
  for (const [code, f] of detailed) {
    if (!coarse.has(code)) coarse.set(code, f);
  }
  return { type: 'FeatureCollection', features: [...coarse.values()] };
}
