import * as fs from 'fs';

type index = number;

interface Location {
  /**
   * The place or city
   */
  p: string;

  /**
   * The region or state
   */
  r: string;

  /**
   * The country
   */
  c: string;
}

interface Entry {
  /**
   * The date of the entry
   */
  d: string;

  /**
   * The index into the 'version' list of the Result
   */
  v: index;

  /**
   * The index into the 'location' list of the Result
   */
  l: index;

  /**
   * The index into the 'systems' list of the Result
   */
  s: index;

  /**
   * The index into the 'profiles' list of the Result
   */
  p: index;
}

class Result {
  constructor() {
    this.locations = [] as Location[];
    this.versions = [] as string[];
    this.systems = [] as string[];
    this.profiles = [] as string[];
    this.entries = [] as Entry[];
  }
  /**
   * The list of all locations that have been encountered
   */
  locations: Location[];

  /**
   * The list of all encountered versions
   */
  versions: string[];

  /**
   * The list of all encountered systems
   */
  systems: string[];

  /**
   * The list of all encountered profiles
   */
  profiles: string[];

  /**
   * The list of all encountered entries
   */
  entries: Entry[];
}
const result = new Result();

/**
 * Returns the index for the provided location and adds it to the array if it didn't exist
 * @param place The place that is looked for or added
 * @param region The region/state that is looked for or added
 * @param country The country that is looked for or added
 * @returns The index that corresponds to the @param place, @param region, and
 *          @param country in the results location list
 */
function indexForLocation(place: string, region: string, country: string): index {
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
function indexForVersions(version: string): index {
  for (let i = 0; i < result.versions.length; i += 1) {
    if (result.versions[i] === version) return i;
  }

  result.versions.push(version);
  return result.versions.length - 1;
}

/**
 * Returns the index for the provided system and adds it to the array if it didn't exist.
 * @param system The system that is looked for or added
 * @return The index that corresponds to the position in the results system list
 */
function indexForSystem(system: string): index {
  for (let i = 0; i < result.systems.length; i += 1) {
    if (result.systems[i] === system) return i;
  }

  result.systems.push(system);
  return result.systems.length - 1;
}

/**
 * Returns the index for the provided profile and adds it to the array if it didn't exist.
 * @param profile The profile that is looked for or added
 * @return The index that corresponds to the position in the results profile list
 */
function indexForProfile(profile: string): index {
  for (let i = 0; i < result.profiles.length; i += 1) {
    if (result.profiles[i] === profile) return i;
  }

  result.profiles.push(profile);
  return result.profiles.length - 1;
}

function processFile(file: string) {
  const content = fs.readFileSync(file, { encoding: 'utf8' }).split('\n');
  for (let j = 0; j < content.length; j += 1) {
    if (content[j].length === 0) continue;
    const s = content[j].split('\t');
    if (s.length < 7 && s.length > 9) {
      throw `Expected 7-9 columns, got ${s.length} in row ${file}[${j}]\n${content[j]}`;
    }

    // Sanitize timing
    // Remove the minutes and seconds from the timestamps
    // format:  YY-MM-DD HH:mm:ss.uuuuuu
    const date = s[0].substring(0, 'YY-MM-DD HH'.length) + ':00:00';
    const version = s[2] || '';
    const city = s[4] || '';
    const region = s[5] || '';
    const country = s[6] || '';
    const system = s[7] || '';
    const profile = (s[8] || '').replace("\\", "/");

    if (system === "US") {
      console.log(s);
    }

    const e = {} as Entry;
    e.d = date;
    e.v = indexForVersions(version);
    e.l = indexForLocation(city, region, country);
    e.s = indexForSystem(system);
    e.p = indexForProfile(profile);
    result.entries.push(e);
  }
}

//
// main
if (process.argv.length < 3) {
  throw `Script needs exactly least 2 arguments.\n  First: Output file.\n  Second: Folder that contains all log files`;
}
const outputFile = process.argv[2];

fs.readdirSync(process.argv[3]).forEach((file) => {
  console.log(`Process ${file}`);
  processFile(process.argv[3] + '/' + file);
});
fs.writeFileSync(outputFile, JSON.stringify(result));
