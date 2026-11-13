/**
 * Functions for parsing the raw startup log files. They are shared by
 * `process_startup_log.ts` and the temporary cleanup of the published data.json.
 */

import type { Index } from './logdata.ts';

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
export function unescapeHtml(value: string): string {
  return value.replace(/&(amp|quot|lt|gt|#39|#x27);/g, (entity) => HtmlEntities[entity]);
}

/**
 * Some log entries contain all information as a single query string in the version
 * column, for example `0.22.0&commit_hash=e1f836ef6e&operating_system=Windows
 * 10/11&profile=default`, while the system and profile columns are empty. This function
 * extracts the version and, if the provided `system` or `profile` are empty, the system
 * and profile from such a string. Regular versions are returned unchanged.
 */
export function parseVersion(
  rawVersion: string,
  system = '',
  profile = ''
): { version: string; system: string; profile: string } {
  const [version, ...parameters] = rawVersion.split('&');
  const values: Record<string, string> = {};
  for (const parameter of parameters) {
    const [key, ...value] = parameter.split('=');
    values[key] = value.join('=');
  }

  return {
    version,
    system: system || values['operating_system'] || '',
    profile: profile || values['profile'] || ''
  };
}

/**
 * Brings the different spellings of the same profile path into a common form
 */
export function normalizeProfile(profile: string): string {
  return (
    profile
      .replaceAll('\\', '/')
      // Remove stray quotes around the profile name
      .replace(/^['"]+|['"]+$/g, '')
  );
}

/**
 * Builds a deduplicating list of values and returns the index of each value in it. If
 * `ignoreCase` is set, values that only differ in case are merged and the spelling that
 * was encountered first is kept.
 */
export function makeIndexer(ignoreCase = false) {
  const list: string[] = [];
  const lookup = new Map<string, Index>();
  return {
    list,
    indexOf(value: string): Index {
      const key = ignoreCase ? value.toLowerCase() : value;
      let idx = lookup.get(key);
      if (idx === undefined) {
        idx = list.length;
        list.push(value);
        lookup.set(key, idx);
      }
      return idx;
    }
  };
}

/**
 * Matches the timestamp at the beginning of each log line: `YY-MM-DD HH:mm:ss.uuuuuu`
 */
const TimestampRegex = /^\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;

/**
 * Matches the remains of other log lines in a field, which happens when two lines were
 * written into the log file on top of each other: a timestamp or an IPv4 address
 */
const ForeignContentRegex =
  /\d{2}-\d{2}-\d{2} \d{2}:\d{2}|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;

/**
 * Matches an ISO 3166-1 alpha-2 country code
 */
const CountryCodeRegex = /^[A-Z]{2}$/;

/**
 * Returns `true` if the provided location looks like a real place. This rejects
 * locations in which the columns have been shifted, for example a commit hash as the city
 * and a region as the country, or that contain fragments of other log lines.
 */
export function isValidLocation(city: string, region: string, country: string): boolean {
  if (city.trim().length === 0 || !CountryCodeRegex.test(country)) return false;
  return ![city, region].some((v) => ForeignContentRegex.test(v));
}

export interface LogLine {
  /**
   * The date of the entry in the form `YY-MM-DD HH:00:00`
   */
  date: string;
  version: string;
  city: string;
  region: string;
  country: string;
  system: string;
  profile: string;
}

/**
 * Parses a single line of a log file. Returns the parsed line or the reason why the line
 * could not be parsed.
 *
 * The columns of a line are separated by tabs and are: timestamp, IP address, version,
 * commit hash, city, region, country, and optionally the operating system and the
 * profile. Some older entries for which the location could not be determined end after
 * the commit hash instead of containing empty location columns.
 */
export function parseLogLine(line: string): LogLine | { error: string } {
  const s = line.split('\t');
  if (s.length !== 4 && (s.length < 7 || s.length > 9)) {
    return { error: `Expected 4 or 7-9 columns, got ${s.length}` };
  }
  if (!TimestampRegex.test(s[0])) {
    return { error: `Invalid timestamp '${s[0]}'` };
  }

  const city = (s[4] ?? '').trim();
  const region = (s[5] ?? '').trim();
  const country = (s[6] ?? '').trim();
  // An empty location is valid as the location could not always be determined
  const hasLocation = city !== '' || region !== '' || country !== '';
  if (hasLocation && !isValidLocation(city, region, country)) {
    return { error: `Invalid location '${city}', '${region}', '${country}'` };
  }

  const parsed = parseVersion(
    unescapeHtml(s[2]),
    unescapeHtml(s[7] ?? ''),
    unescapeHtml(s[8] ?? '')
  );
  if (ForeignContentRegex.test(parsed.version)) {
    return { error: `Invalid version '${parsed.version}'` };
  }

  return {
    // Remove the minutes and seconds from the timestamps
    date: s[0].substring(0, 'YY-MM-DD HH'.length) + ':00:00',
    version: parsed.version,
    city,
    region,
    country,
    system: parsed.system,
    profile: normalizeProfile(parsed.profile)
  };
}
