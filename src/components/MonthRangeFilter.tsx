import { useState } from 'react';

import type { MonthRange } from '../util.ts';

/**
 * Converts the "YYYY-MM" value of a month input into "YY-MM", or `null` if it is empty or
 * not a complete month. Browsers without a month picker fall back to a text field, in
 * which case the value might be partially typed
 */
function parseMonth(value: string): string | null {
  return /^20\d{2}-\d{2}$/.test(value) ? value.substring(2) : null;
}

interface Props {
  onChange: (range: MonthRange) => void;
}

export function MonthRangeFilter({ onChange }: Props) {
  const [begin, setBegin] = useState('');
  const [end, setEnd] = useState('');

  function update(newBegin: string, newEnd: string) {
    setBegin(newBegin);
    setEnd(newEnd);
    onChange({ begin: parseMonth(newBegin), end: parseMonth(newEnd) });
  }

  return (
    <div className={'filter'}>
      <label>
        From
        <input
          type={'month'}
          placeholder={'YYYY-MM'}
          value={begin}
          onChange={(e) => update(e.target.value, end)}
        />
      </label>
      <label>
        To
        <input
          type={'month'}
          placeholder={'YYYY-MM'}
          value={end}
          onChange={(e) => update(begin, e.target.value)}
        />
      </label>
      <button
        type={'button'}
        disabled={begin === '' && end === ''}
        onClick={() => update('', '')}
      >
        Reset
      </button>
    </div>
  );
}
