import { describe, expect, it } from '@jest/globals';
import { normalizeTime, subtractMinutes } from './time';

describe('normalizeTime', () => {
  it.each([
    ['08:30', '08:30'],
    ['8:5', '08:05'],
    ['830', '08:30'],
    ['2130', '21:30'],
    ['7', '07:00'],
    ['2575', '23:59'],
    ['99:99', '23:59'],
    ['', '00:00'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeTime(input)).toBe(expected);
  });
});

describe('subtractMinutes', () => {
  it('stays on the same day', () => {
    expect(subtractMinutes('08:15', 10)).toEqual({ hour: 8, minute: 5, dayShift: 0 });
  });

  it('rolls back past midnight', () => {
    expect(subtractMinutes('00:10', 30)).toEqual({ hour: 23, minute: 40, dayShift: -1 });
  });
});
