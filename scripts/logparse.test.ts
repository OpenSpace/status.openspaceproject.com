import { describe, expect, it } from 'vitest';

import {
  isValidLocation,
  makeIndexer,
  normalizeProfile,
  parseLogLine,
  parseVersion,
  unescapeHtml
} from './logparse.ts';

function line(...columns: string[]): string {
  return columns.join('\t');
}

describe('unescapeHtml', () => {
  it('reverses the HTML escaping', () => {
    expect(unescapeHtml('a&amp;b &quot;c&quot; &lt;d&gt; &#39;e&#x27;')).toBe(
      `a&b "c" <d> 'e'`
    );
  });

  it('leaves unknown entities alone', () => {
    expect(unescapeHtml('&nbsp;')).toBe('&nbsp;');
  });
});

describe('parseVersion', () => {
  it('returns regular versions unchanged', () => {
    expect(parseVersion('0.21.0', 'Windows', 'default')).toEqual({
      version: '0.21.0',
      system: 'Windows',
      profile: 'default'
    });
  });

  it('extracts the system and profile from a query string', () => {
    expect(
      parseVersion('0.22.0&commit_hash=e1f8&operating_system=Windows 10/11&profile=mars')
    ).toEqual({ version: '0.22.0', system: 'Windows 10/11', profile: 'mars' });
  });

  it('prefers the provided system and profile', () => {
    expect(
      parseVersion('0.22.0&operating_system=Linux&profile=mars', 'macOS', 'moon')
    ).toEqual({ version: '0.22.0', system: 'macOS', profile: 'moon' });
  });

  it('keeps equal signs in values', () => {
    expect(parseVersion('1&profile=a=b').profile).toBe('a=b');
  });
});

describe('normalizeProfile', () => {
  it('uses forward slashes and removes surrounding quotes', () => {
    expect(normalizeProfile(`"'user\\my profile'"`)).toBe('user/my profile');
  });
});

describe('makeIndexer', () => {
  it('deduplicates values', () => {
    const indexer = makeIndexer();
    const indices = [indexer.indexOf('a'), indexer.indexOf('b'), indexer.indexOf('a')];
    expect(indices).toEqual([0, 1, 0]);
    expect(indexer.list).toEqual(['a', 'b']);
  });

  it('keeps the first spelling when ignoring the case', () => {
    const indexer = makeIndexer(true);
    expect([indexer.indexOf('Default'), indexer.indexOf('default')]).toEqual([0, 0]);
    expect(indexer.list).toEqual(['Default']);
  });
});

describe('isValidLocation', () => {
  it('accepts regular places', () => {
    expect(isValidLocation('Washington', 'Washington, D.C.', 'US')).toBe(true);
    expect(isValidLocation('Norrköping', '', 'SE')).toBe(true);
  });

  it('rejects places with shifted columns', () => {
    expect(isValidLocation('98ea3486c', 'Norrköping', 'Östergötland')).toBe(false);
  });

  it('rejects places containing parts of other log lines', () => {
    expect(
      isValidLocation('New York Ci20-05-06 02:39:05.911522', '70.19.52.64', 'US')
    ).toBe(false);
    expect(isValidLocation('Columbus', 'Ohio 82.203.185.131', 'US')).toBe(false);
  });

  it('rejects places without a city', () => {
    expect(isValidLocation(' ', 'Ohio', 'US')).toBe(false);
  });
});

describe('parseLogLine', () => {
  const valid = line(
    '24-06-17 13:45:12.123456',
    '127.0.0.1',
    '0.20.0',
    '',
    'Linköping',
    'Östergötland',
    'SE',
    'Windows',
    'user\\mine'
  );

  it('parses a valid line', () => {
    expect(parseLogLine(valid)).toEqual({
      date: '24-06-17 13:00:00',
      version: '0.20.0',
      city: 'Linköping',
      region: 'Östergötland',
      country: 'SE',
      system: 'Windows',
      profile: 'user/mine'
    });
  });

  it('accepts lines without system and profile', () => {
    const result = parseLogLine(valid.split('\t').slice(0, 7).join('\t'));
    expect(result).toMatchObject({ system: '', profile: '' });
  });

  it('accepts lines without a location', () => {
    const result = parseLogLine(
      line('24-06-17 13:45:12', 'ip', '0.20.0', '', '', '', '')
    );
    expect(result).toMatchObject({ city: '', country: '' });
  });

  it('accepts lines that end after the commit hash', () => {
    expect(
      parseLogLine(line('23-07-24 17:23:58.268064', '38.125.0.0', '0.18.0', '587711210'))
    ).toEqual({
      date: '23-07-24 17:00:00',
      version: '0.18.0',
      city: '',
      region: '',
      country: '',
      system: '',
      profile: ''
    });
  });

  it('accepts lines that end after the version', () => {
    expect(
      parseLogLine(line('22-02-22 11:48:33.131486', '10.245.0.0', '0.17.1'))
    ).toEqual({
      date: '22-02-22 11:00:00',
      version: '0.17.1',
      city: '',
      region: '',
      country: '',
      system: '',
      profile: ''
    });
  });

  it('rejects lines with too few or too many columns', () => {
    expect(parseLogLine(line('24-06-17 13:45:12', 'ip'))).toHaveProperty('error');
    expect(
      parseLogLine(line('24-06-17 13:45:12', 'ip', '0.20.0', 'hash', 'city', 'region'))
    ).toHaveProperty('error');
    expect(
      parseLogLine(line('24-06-17 13:45:12', 'ip', '0.20.0', 'hash', 'city'))
    ).toHaveProperty('error');
    expect(parseLogLine(line(valid, 'extra'))).toHaveProperty('error');
  });

  it('rejects lines without a valid timestamp', () => {
    expect(parseLogLine(valid.replace('24-06-17', 'garbage'))).toHaveProperty('error');
  });

  it('rejects lines that were written on top of each other', () => {
    const broken = line(
      '20-05-06 02:39:05.911522',
      'ip',
      '0.15.1',
      '',
      'New York Ci20-05-06 02:39:05.911522',
      '70.19.52.64',
      '0.15.1'
    );
    expect(parseLogLine(broken)).toHaveProperty('error');
  });
});
