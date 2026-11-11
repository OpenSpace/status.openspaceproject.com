// Rewrites geolocation.json with one place per line, sorted by place, and with all
// positions stored as numbers

import {
  GeolocationFile,
  readGeolocations,
  validateGeolocations,
  writeGeolocations
} from './geolocation.ts';

const geolocations = readGeolocations();
for (const warning of validateGeolocations(geolocations).warnings) {
  console.log(`Warning: ${warning}`);
}
writeGeolocations(geolocations);
console.log(`Wrote ${Object.keys(geolocations).length} places to ${GeolocationFile}`);
