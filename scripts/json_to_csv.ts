// Downloads the data.json and converts it into a flat CSV file

import fs from 'node:fs';

import { loadData } from './logdata.ts';

const data = await loadData();

fs.writeFileSync('data.csv', 'Date, City, Region, Country, Version, Profile, System\n');

for (const entry of data.entries) {
  const date = entry.d;
  const locationObj = data.locations[entry.l];
  const location = `${locationObj.p.replaceAll(',', ' ')}, ${locationObj.r.replaceAll(',', ' ')}, ${locationObj.c.replaceAll(',', ' ')}`;
  const version = data.versions[entry.v];
  const profile = data.profiles[entry.p];
  const system = data.systems[entry.s];

  fs.appendFileSync(
    'data.csv',
    `${date}, ${location}, ${version}, ${profile}, ${system}\n`
  );
}
