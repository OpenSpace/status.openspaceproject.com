// Checks that geolocation.json only contains valid positions and that it is formatted as
// written by format-geolocation.ts. Exits with an error code otherwise

import fs from 'node:fs';

import {
  formatGeolocations,
  GeolocationFile,
  readGeolocations,
  validateGeolocations
} from './geolocation.ts';

const geolocations = readGeolocations();
const { errors, warnings } = validateGeolocations(geolocations);
for (const warning of warnings) console.log(`Warning: ${warning}`);
for (const error of errors) console.log(`Error: ${error}`);

// Git might have converted the line endings on checkout, which is not a problem
const content = fs.readFileSync(GeolocationFile, 'utf8').replaceAll('\r\n', '\n');
if (content !== formatGeolocations(geolocations)) {
  errors.push('not formatted');
  console.log(
    `Error: ${GeolocationFile} is not formatted. Run 'npm run format-geolocation'`
  );
}

if (errors.length > 0) {
  process.exitCode = 1;
} else {
  console.log(`${GeolocationFile} is valid (${warnings.length} warnings)`);
}
