import { describe, expect, it } from '@jest/globals';
import { adherenceRate, buildSlots, dailyTally, dueAt, slotState } from './slots';
import { dose, medicine } from '../test/factories';

describe('buildSlots', () => {
  it('covers each scheduled dose for the given number of days', () => {
    const meds = [medicine({ name: '혈압약', times: ['08:00', '20:00'] })];
    const slots = buildSlots(meds, [], '2026-11-02', 3);
    expect(slots.map((s) => s.id)).toEqual([
      'm1_2026-11-02_0800',
      'm1_2026-11-02_2000',
      'm1_2026-11-03_0800',
      'm1_2026-11-03_2000',
      'm1_2026-11-04_0800',
      'm1_2026-11-04_2000',
    ]);
    expect(slots[0].medicine_name).toBe('혈압약');
    expect(slots[0].due_at).toBe(dueAt('2026-11-02', '08:00').toISOString());
  });

  it('carries taken state from local records', () => {
    const slots = buildSlots([medicine()], [dose('2026-11-02', true)], '2026-11-02', 2);
    expect(slots[0].taken_at).toBe('2026-11-02T08:01:00.000Z');
    expect(slots[1].taken_at).toBeNull();
  });

  it('skips inactive medicines and days off', () => {
    const meds = [
      medicine({ id: 'a', isActive: false }),
      medicine({ id: 'b', days: [1] }), // Mondays; 2026-11-02 is a Monday
    ];
    expect(buildSlots(meds, [], '2026-11-02', 7).map((s) => s.id)).toEqual(['b_2026-11-02_0800']);
  });
});

describe('slotState', () => {
  const due = dueAt('2026-11-02', '08:00');
  const at = (min: number) => new Date(due.getTime() + min * 60000);
  const slot = { due_at: due.toISOString(), taken_at: null };

  it('moves from upcoming to late to missed', () => {
    expect(slotState(slot, at(-5))).toBe('upcoming');
    expect(slotState(slot, at(10))).toBe('late');
    expect(slotState(slot, at(30))).toBe('missed');
  });

  it('follows the guardian\'s chosen delay', () => {
    expect(slotState(slot, at(12), 10)).toBe('missed');
    expect(slotState(slot, at(45), 60)).toBe('late');
  });

  it('is taken once taken_at is set', () => {
    expect(slotState({ ...slot, taken_at: due.toISOString() }, at(90))).toBe('taken');
  });
});

describe('dailyTally', () => {
  const now = dueAt('2026-11-04', '12:00');
  const slot = (date: string, time: string, taken: boolean) => ({
    due_at: dueAt(date, time).toISOString(),
    taken_at: taken ? dueAt(date, time).toISOString() : null,
  });

  it('counts taken and missed per day, oldest first', () => {
    const tally = dailyTally(
      [
        slot('2026-11-03', '08:00', true),
        slot('2026-11-03', '20:00', false),
        slot('2026-11-04', '08:00', true),
        slot('2026-11-04', '20:00', false), // still upcoming
        slot('2026-10-01', '08:00', true), // outside the window
      ],
      '2026-11-04',
      now,
      30,
      3
    );
    expect(tally).toEqual([
      { date: '2026-11-02', total: 0, taken: 0, missed: 0 },
      { date: '2026-11-03', total: 2, taken: 1, missed: 1 },
      { date: '2026-11-04', total: 2, taken: 1, missed: 0 },
    ]);
    expect(adherenceRate(tally)).toBe(67);
  });

  it('has no rate before anything is due', () => {
    expect(adherenceRate(dailyTally([], '2026-11-04', now))).toBeNull();
  });
});
