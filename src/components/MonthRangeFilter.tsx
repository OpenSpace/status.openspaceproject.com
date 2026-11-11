import { useState } from 'react';

import { addMonths, type MonthRange } from '../util.ts';

/**
 * Returns the "YYYY-MM" value of a month input, or `null` if it is empty or not a complete
 * month. Browsers without a month picker fall back to a text field, in which case the
 * value might be partially typed
 */
function parseMonth(value: string): string | null {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : null;
}

interface Preset {
  label: string;

  /**
   * Returns the first and last month of the preset, relative to the latest month for
   * which there is data
   */
  range: (latest: string) => [string, string];
}

const Presets: Preset[] = [
  { label: 'Last 3 months', range: (latest) => [addMonths(latest, -2), latest] },
  { label: 'Last 12 months', range: (latest) => [addMonths(latest, -11), latest] },
  { label: 'This year', range: (latest) => [`${latest.substring(0, 4)}-01`, latest] },
  {
    label: 'Last year',
    range: (latest) => {
      const year = Number(latest.substring(0, 4)) - 1;
      return [`${year}-01`, `${year}-12`];
    }
  }
];

interface Props {
  /**
   * The latest month for which there is data in the form "YYYY-MM". The presets are
   * relative to this month
   */
  latestMonth: string;

  onChange: (range: MonthRange) => void;
}

export function MonthRangeFilter({ latestMonth, onChange }: Props) {
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
          max={latestMonth}
          onChange={(e) => update(e.target.value, end)}
        />
      </label>
      <label>
        To
        <input
          type={'month'}
          placeholder={'YYYY-MM'}
          value={end}
          max={latestMonth}
          onChange={(e) => update(begin, e.target.value)}
        />
      </label>
      <div className={'filter__presets'} role={'group'} aria-label={'Presets'}>
        {Presets.map((preset) => {
          const [presetBegin, presetEnd] = preset.range(latestMonth);
          return (
            <button
              key={preset.label}
              type={'button'}
              aria-pressed={begin === presetBegin && end === presetEnd}
              onClick={() => update(presetBegin, presetEnd)}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type={'button'}
          aria-pressed={begin === '' && end === ''}
          onClick={() => update('', '')}
        >
          All time
        </button>
      </div>
    </div>
  );
}
