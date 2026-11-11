/**
 * Returns the provided value as a CSV field according to RFC 4180. Fields that contain a
 * separator, quote, line break, or surrounding whitespace are enclosed in quotes and
 * quotes inside them are doubled.
 */
export function csvField(value: string): string {
  if (/[",\r\n]|^\s|\s$/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

/**
 * Returns the provided values as a single CSV row, terminated by CRLF as required by
 * RFC 4180
 */
export function csvRow(values: string[]): string {
  return values.map(csvField).join(',') + '\r\n';
}
