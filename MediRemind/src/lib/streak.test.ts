import { describe, expect, it } from '@jest/globals';
import { computeStreak, dayStatuses } from './streak';
import { dose } from '../test/factories';

describe('streak', () => {
  it('classifies days as complete, partial or missed', () => {
    const statuses = dayStatuses([
      dose('2026-03-01', true),
      dose('2026-03-02', true),
      dose('2026-03-02', false, { id: 'x' }),
      dose('2026-03-03', false),
    ]);
    expect(statuses.get('2026-03-01')).toBe('complete');
    expect(statuses.get('2026-03-02')).toBe('partial');
    expect(statuses.get('2026-03-03')).toBe('missed');
  });

  it('counts consecutive complete days and stops at a miss', () => {
    const records = [
      dose('2026-03-01', false),
      dose('2026-03-02', true),
      dose('2026-03-03', true),
      dose('2026-03-04', true),
    ];
    expect(computeStreak(records, '2026-03-04')).toBe(3);
  });

  it("doesn't break on today still being pending", () => {
    const records = [dose('2026-03-02', true), dose('2026-03-03', true), dose('2026-03-04', false)];
    expect(computeStreak(records, '2026-03-04')).toBe(2);
  });

  it('ignores days with nothing scheduled', () => {
    const records = [dose('2026-03-01', true), dose('2026-03-04', true)];
    expect(computeStreak(records, '2026-03-04')).toBe(2);
  });

  it('is zero when yesterday was missed', () => {
    expect(computeStreak([dose('2026-03-03', false)], '2026-03-04')).toBe(0);
  });
});
