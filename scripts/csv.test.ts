import { describe, expect, it } from 'vitest';

import { csvField, csvRow } from './csv.ts';

describe('csvField', () => {
  it('leaves simple values unchanged', () => {
    expect(csvField('Linköping')).toBe('Linköping');
  });

  it('quotes values with separators, quotes, line breaks, or surrounding spaces', () => {
    expect(csvField('Washington, D.C.')).toBe('"Washington, D.C."');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('a\nb')).toBe('"a\nb"');
    expect(csvField(' a')).toBe('" a"');
  });
});

describe('csvRow', () => {
  it('joins the fields and terminates the row with CRLF', () => {
    expect(csvRow(['a', 'b,c', ''])).toBe('a,"b,c",\r\n');
  });
});
