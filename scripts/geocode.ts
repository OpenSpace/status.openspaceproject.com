// Looks up the geographic position of all places in the data.json that are not yet in
// geolocation.json, using the ArcGIS geocoding service, and adds them to the file. The
// updated geolocation.json should then be committed.
//
// Places that do not look like a valid place or for which no unambiguous position could
// be found are reported and skipped.

import {
  GeolocationFile,
  type GeoPosition,
  isValidPlace,
  placeKey,
  readGeolocations,
  writeGeolocations
} from './geolocation.ts';
import { loadData } from './logdata.ts';

interface GeocodeResponse {
  candidates: {
    location: { x: number; y: number };
    score: number;
  }[];
}

/**
 * The minimum score a candidate needs to be accepted if there is more than one candidate
 */
const MinScore = 75;

async function geocode(place: string): Promise<GeoPosition | { error: string }> {
  const url = new URL(
    'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates'
  );
  url.search = new URLSearchParams({
    SingleLine: place,
    outFields: 'score',
    forStorage: 'false',
    f: 'json'
  }).toString();

  const res = await fetch(url);
  if (!res.ok) return { error: `Request failed with status ${res.status}` };

  const { candidates } = (await res.json()) as GeocodeResponse;
  candidates.sort((a, b) => b.score - a.score);
  if (candidates.length === 0) return { error: 'No candidates found' };
  if (candidates.length > 1 && candidates[0].score < MinScore) {
    return {
      error: `${candidates.length} candidates, the best has a score of ${candidates[0].score}`
    };
  }
  return { lat: candidates[0].location.y, lng: candidates[0].location.x };
}

//
// main
const data = await loadData();
const geolocations = readGeolocations();

const unknown = new Set<string>();
let invalid = 0;
for (const location of data.locations) {
  const key = placeKey(location);
  if (key in geolocations || unknown.has(key)) continue;
  if (isValidPlace(location)) {
    unknown.add(key);
  } else if (location.p.trim() !== '' || location.c.trim() !== '') {
    invalid += 1;
  }
}
console.log(`${unknown.size} places to geocode, ${invalid} invalid places ignored`);

const failed: string[] = [];
for (const place of unknown) {
  const result = await geocode(place);
  if ('error' in result) {
    console.log(`Failed: ${place}: ${result.error}`);
    failed.push(place);
    continue;
  }

  console.log(`${place}: ${result.lat}, ${result.lng}`);
  geolocations[place] = result;
  // Write after every place so that the progress is kept if the script is interrupted
  writeGeolocations(geolocations);
}

console.log(
  `Added ${unknown.size - failed.length} places to ${GeolocationFile}, ${failed.length} failed`
);
