// Generates the data files that are loaded by the page:
//  - usage.json: The raw data.json aggregated into a compact form
//  - world.json: The outlines of the countries for the country map
//
// Places that have not been geocoded yet are left out of the usage map. They are added to
// geolocation.json by running `npm run geocode`

import fs from 'node:fs';
import path from 'node:path';

import { aggregate } from './aggregate.ts';
import { readGeolocations } from './geolocation.ts';
import { loadData } from './logdata.ts';
import { createWorldMap } from './world.ts';

const OutputFolder = 'src/generated';

interface ReleaseData {
  /**
   * Maps the date of a release in the form "YY-MM-DD" to the released version
   */
  dates: Record<string, string>;
}

function write(file: string, content: unknown) {
  const p = path.join(OutputFolder, file);
  fs.writeFileSync(p, JSON.stringify(content));
  console.log(`Wrote ${p} (${Math.round(fs.statSync(p).size / 1024)} KiB)`);
}

//
// main
const releases = JSON.parse(fs.readFileSync('releases.json', 'utf8')) as ReleaseData;
const { usage, missing } = aggregate(
  await loadData(),
  readGeolocations(),
  releases.dates
);

if (missing.size > 0) {
  console.log(
    `Warning: ${missing.size} places have no geolocation and are not shown on the map. ` +
      "Run 'npm run geocode' and commit geolocation.json to add them"
  );
}

fs.mkdirSync(OutputFolder, { recursive: true });
write('usage.json', usage);
write('world.json', createWorldMap());
