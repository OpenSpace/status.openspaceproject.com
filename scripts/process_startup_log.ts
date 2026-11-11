import fs from 'node:fs';

import type { Entry, Index, LogData } from './logdata.ts';

const result: LogData = {
  locations: [],
  versions: [],
  systems: [],
  profiles: [],
  entries: []
};

/**
 * Returns the index for the provided location and adds it to the array if it didn't exist
 * @param place The place that is looked for or added
 * @param region The region/state that is looked for or added
 * @param country The country that is looked for or added
 * @returns The index that corresponds to the @param place, @param region, and
 *          @param country in the results location list
 */
function indexForLocation(place: string, region: string, country: string): Index {
  for (let i = 0; i < result.locations.length; i += 1) {
    const eq =
      result.locations[i].p === place &&
      result.locations[i].r === region &&
      result.locations[i].c === country;
    if (eq) return i;
  }

  result.locations.push({ p: place, r: region, c: country });
  return result.locations.length - 1;
}

/**
 * Returns the index for the provided version and adds it to the array if it didn't exist.
 * @param version The version that is looked for or added
 * @returns The index that corresponds to the position in the results version list
 */
function indexForVersions(version: string): Index {
  for (let i = 0; i < result.versions.length; i += 1) {
    if (result.versions[i] === version) return i;
  }

  result.versions.push(version);
  return result.versions.length - 1;
}

/**
 * Returns the index for the provided system and adds it to the array if it didn't exist.
 * The comparison ignores the case, as the same system is sometimes reported in lowercase,
 * and the spelling that was encountered first is kept.
 * @param system The system that is looked for or added
 * @return The index that corresponds to the position in the results system list
 */
function indexForSystem(system: string): Index {
  for (let i = 0; i < result.systems.length; i += 1) {
    if (result.systems[i].toLowerCase() === system.toLowerCase()) return i;
  }

  result.systems.push(system);
  return result.systems.length - 1;
}

/**
 * Returns the index for the provided profile and adds it to the array if it didn't exist.
 * The comparison ignores the case, as the same profile is sometimes reported in lowercase,
 * and the spelling that was encountered first is kept.
 * @param profile The profile that is looked for or added
 * @return The index that corresponds to the position in the results profile list
 */
function indexForProfile(profile: string): Index {
  for (let i = 0; i < result.profiles.length; i += 1) {
    if (result.profiles[i].toLowerCase() === profile.toLowerCase()) return i;
  }

  result.profiles.push(profile);
  return result.profiles.length - 1;
}

const HtmlEntities: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&lt;': '<',
  '&gt;': '>',
  '&#39;': "'",
  '&#x27;': "'"
};

/**
 * Reverses the HTML escaping that has been applied to the values in the log files
 */
function unescapeHtml(value: string): string {
  return value.replace(/&(amp|quot|lt|gt|#39|#x27);/g, (entity) => HtmlEntities[entity]);
}

/**
 * Some log entries contain all information as a single query string in the version
 * column, for example `0.22.0&commit_hash=e1f836ef6e&operating_system=Windows
 * 10/11&profile=default`, while the system and profile columns are empty. This function
 * extracts the version and, if the respective columns are empty, the system and profile
 * from such a string. Regular versions are returned unchanged.
 */
function parseVersion(
  rawVersion: string,
  rawSystem: string,
  rawProfile: string
): { version: string; system: string; profile: string } {
  const [version, ...parameters] = rawVersion.split('&');
  const values: Record<string, string> = {};
  for (const parameter of parameters) {
    const [key, ...value] = parameter.split('=');
    values[key] = value.join('=');
  }

  return {
    version: version,
    system: rawSystem || values['operating_system'] || '',
    profile: rawProfile || values['profile'] || ''
  };
}

function processFile(file: string) {
  const content = fs.readFileSync(file, { encoding: 'utf8' }).split('\n');
  for (let j = 0; j < content.length; j += 1) {
    if (content[j].length === 0) continue;
    const s = content[j].split('\t');
    if (s.length < 7 && s.length > 9) {
      throw new Error(
        `Expected 7-9 columns, got ${s.length} in row ${file}[${j}]\n${content[j]}`
      );
    }

    // Sanitize timing
    // Remove the minutes and seconds from the timestamps
    // format:  YY-MM-DD HH:mm:ss.uuuuuu
    const date = s[0].substring(0, 'YY-MM-DD HH'.length) + ':00:00';
    const city = s[4] || '';
    const region = s[5] || '';
    const country = s[6] || '';
    const parsed = parseVersion(
      unescapeHtml(s[2] || ''),
      unescapeHtml(s[7] || ''),
      unescapeHtml(s[8] || '')
    );
    const { version, system } = parsed;
    const profile = parsed.profile
      .replaceAll('\\', '/')
      // Remove stray quotes around the profile name
      .replace(/^['"]+|['"]+$/g, '');

    if (system === 'US') {
      console.log(s);
    }

    const e: Entry = {
      d: date,
      v: indexForVersions(version),
      l: indexForLocation(city, region, country),
      s: indexForSystem(system),
      p: indexForProfile(profile)
    };
    result.entries.push(e);
  }
}

//
// main
if (process.argv.length < 4) {
  throw new Error(
    'Script needs exactly 2 arguments.\n  First: Output file.\n  Second: Folder that contains all log files'
  );
}
const [, , outputFile, logFolder] = process.argv;

fs.readdirSync(logFolder).forEach((file) => {
  console.log(`Process ${file}`);
  processFile(logFolder + '/' + file);
});
fs.writeFileSync(outputFile, JSON.stringify(result));
