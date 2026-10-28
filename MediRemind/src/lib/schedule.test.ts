import { describe, expect, it } from '@jest/globals';
import { addDays, dateRange, expectedDoseRecords, scheduledWeekdays } from './schedule';
import { medicine } from '../test/factories';

describe('schedule', () => {
  it('maps day modes to weekdays', () => {
    expect(scheduledWeekdays('weekday')).toEqual([1, 2, 3, 4, 5]);
    expect(scheduledWeekdays('weekend')).toEqual([0, 6]);
    expect(scheduledWeekdays([3, 1, 3])).toEqual([1, 3]);
  });

  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('builds inclusive date ranges', () => {
    expect(dateRange('2026-01-30', '2026-02-01')).toEqual(['2026-01-30', '2026-01-31', '2026-02-01']);
    expect(dateRange('2026-02-02', '2026-02-01')).toEqual([]);
  });

  it('creates one untaken record per dose time on scheduled days', () => {
    const recs = expectedDoseRecords([medicine({ times: ['08:00', '20:30'] })], '2026-03-02');
    expect(recs.map((r) => r.id)).toEqual(['m1_2026-03-02_0800', 'm1_2026-03-02_2030']);
    expect(recs.every((r) => !r.isTaken)).toBe(true);
  });

  it('skips days the medicine is not taken and days before it was added', () => {
    const weekend = medicine({ days: 'weekend' });
    expect(expectedDoseRecords([weekend], '2026-03-02')).toEqual([]); // Monday
    const late = medicine({ createdAt: '2026-03-10T09:00:00' });
    expect(expectedDoseRecords([late], '2026-03-09')).toEqual([]);
    expect(expectedDoseRecords([late], '2026-03-10')).toHaveLength(1);
  });
});
