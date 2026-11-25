// Downloads the data.json and converts it into a flat CSV file
//
// Usage: node scripts/json_to_csv.ts [output file, defaults to data.csv]

import fs from 'node:fs';

import { csvRow } from './csv.ts';
import { loadData, lookup } from './logdata.ts';

const outputFile = process.argv[2] ?? 'data.csv';
const data = await loadData();

const rows = [
  csvRow(['Date', 'City', 'Region', 'Country', 'Version', 'Profile', 'System'])
];
for (const entry of data.entries) {
  const location = lookup(data.locations, entry.l);
  rows.push(
    csvRow([
      entry.d,
      location.p,
      location.r,
      location.c,
      lookup(data.versions, entry.v),
      lookup(data.profiles, entry.p),
      lookup(data.systems, entry.s)
    ])
  );
}

fs.writeFileSync(outputFile, rows.join(''));
console.log(`Wrote ${data.entries.length} entries to ${outputFile}`);
