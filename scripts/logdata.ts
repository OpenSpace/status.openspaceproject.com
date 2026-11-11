/**
 * Types describing the `data.json` file that is created by `process_startup_log.ts` and
 * consumed by `generate-data.ts` and `json_to_csv.ts`.
 */

import fs from 'node:fs';
import path from 'node:path';

export type Index = number;

export interface Location {
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

export interface Entry {
  /**
   * The date of the entry
   */
  d: string;

  /**
   * The index into the 'version' list of the LogData
   */
  v: Index;

  /**
   * The index into the 'location' list of the LogData
   */
  l: Index;

  /**
   * The index into the 'systems' list of the LogData
   */
  s: Index;

  /**
   * The index into the 'profiles' list of the LogData
   */
  p: Index;
}

export interface LogData {
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

/**
 * The location of the raw data file that is created by `process_startup_log.ts`
 */
export const DataUrl = 'https://data.openspaceproject.com/log/data.json';

/**
 * The folder in which the downloaded data file is cached between runs
 */
const CacheFolder = '.cache';

interface CacheInfo {
  url: string;
  etag: string;
}

/**
 * Returns the parsed data file from the provided `url`.
 *
 * The file is large but changes only rarely, so a copy of it is kept in the cache folder
 * together with its ETag. On subsequent calls the server is asked whether the file has
 * changed and it is only downloaded again if it has. If the server cannot be reached, the
 * cached copy is used instead.
 */
export async function loadData(url: string = DataUrl): Promise<LogData> {
  const dataFile = path.join(CacheFolder, 'data.json');
  const infoFile = path.join(CacheFolder, 'data.info.json');

  let info: CacheInfo | null = null;
  if (fs.existsSync(dataFile) && fs.existsSync(infoFile)) {
    info = JSON.parse(fs.readFileSync(infoFile, 'utf8')) as CacheInfo;
    if (info.url !== url) info = null;
  }

  function readCache(reason: string): LogData {
    console.log(`Using cached ${dataFile}: ${reason}`);
    return JSON.parse(fs.readFileSync(dataFile, 'utf8')) as LogData;
  }

  let res: Response;
  try {
    res = await fetch(url, { headers: info ? { 'If-None-Match': info.etag } : {} });
  } catch (e) {
    if (info) return readCache(`Could not reach ${url} (${String(e)})`);
    throw e;
  }

  if (res.status === 304 && info) return readCache('File has not changed');
  if (!res.ok) {
    if (info) return readCache(`Failed to load ${url}: ${res.status}`);
    throw new Error(`Failed to load ${url}: ${res.status}`);
  }

  console.log(`Downloading ${url}`);
  const text = await res.text();
  fs.mkdirSync(CacheFolder, { recursive: true });
  fs.writeFileSync(dataFile, text);
  const etag = res.headers.get('etag');
  if (etag) {
    fs.writeFileSync(infoFile, JSON.stringify({ url, etag } satisfies CacheInfo));
  } else {
    fs.rmSync(infoFile, { force: true });
  }
  return JSON.parse(text) as LogData;
}
