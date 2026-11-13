// Converts the raw startup log files into the data.json file that is published at
// https://data.openspaceproject.com/log/data.json
//
// Usage: node scripts/process_startup_log.ts <output file> <folder with log files>

import fs from 'node:fs';
import path from 'node:path';

import type { Entry, LogData } from './logdata.ts';
import { makeIndexer, parseLogLine } from './logparse.ts';

if (process.argv.length !== 4) {
  throw new Error(
    'Script needs exactly 2 arguments.\n  First: Output file.\n  Second: Folder that contains all log files'
  );
}
const [, , outputFile, logFolder] = process.argv;

const versions = makeIndexer();
// The same system and profile are sometimes reported in lowercase
const systems = makeIndexer(true);
const profiles = makeIndexer(true);
const locations = makeIndexer();
const locationList: LogData['locations'] = [];
const entries: Entry[] = [];
let skipped = 0;

for (const file of fs.readdirSync(logFolder)) {
  console.log(`Process ${file}`);
  const lines = fs.readFileSync(path.join(logFolder, file), 'utf8').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim().length === 0) continue;

    const line = parseLogLine(lines[i]);
    if ('error' in line) {
      console.log(`Skipping ${file}:${i + 1}: ${line.error}`);
      skipped += 1;
      continue;
    }

    // The location is stored as a single key to deduplicate it
    const locationKey = JSON.stringify([line.city, line.region, line.country]);
    const l = locations.indexOf(locationKey);
    if (l === locationList.length) {
      locationList.push({ p: line.city, r: line.region, c: line.country });
    }

    entries.push({
      d: line.date,
      v: versions.indexOf(line.version),
      l,
      s: systems.indexOf(line.system),
      p: profiles.indexOf(line.profile)
    });
  }
}

const result: LogData = {
  locations: locationList,
  versions: versions.list,
  systems: systems.list,
  profiles: profiles.list,
  entries
};
fs.writeFileSync(outputFile, JSON.stringify(result));
console.log(`Wrote ${entries.length} entries to ${outputFile}, skipped ${skipped} lines`);

// List the versions that were encountered in the logs but have no release date. The empty
// version belongs to builds without a version number and is not a release
const releases = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, '..', 'releases.json'), 'utf8')
) as { dates: Record<string, string> };
const released = new Set(Object.values(releases.dates));
const undated = versions.list.filter((v) => v !== '' && !released.has(v)).sort();
if (undated.length > 0) {
  console.log(`${undated.length} versions have no release date in releases.json:`);
  for (const v of undated) {
    console.log(`  ${v}`);
  }
}
