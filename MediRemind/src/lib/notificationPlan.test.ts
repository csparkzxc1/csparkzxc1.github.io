import { describe, expect, it } from '@jest/globals';
import { buildNotificationPlan } from './notificationPlan';
import { medicine } from '../test/factories';

describe('buildNotificationPlan', () => {
  it('uses one DAILY trigger per time for an everyday medicine', () => {
    const plan = buildNotificationPlan([medicine({ times: ['08:00', '21:00'] })]);
    expect(plan.map((p) => p.key)).toEqual(['daily|08:00', 'daily|21:00']);
    expect(plan.every((p) => p.weekday === null)).toBe(true);
  });

  it('merges medicines that ring at the same time into one notification', () => {
    const plan = buildNotificationPlan([
      medicine({ id: 'a', name: 'A', times: ['08:00'] }),
      medicine({ id: 'b', name: 'B', times: ['08:00'] }),
    ]);
    expect(plan).toHaveLength(1);
    expect(plan[0].doses.map((d) => d.medicineId)).toEqual(['a', 'b']);
  });

  it('uses WEEKLY triggers (1=Sun) for weekday-only medicines', () => {
    const plan = buildNotificationPlan([medicine({ days: 'weekday', times: ['09:00'] })]);
    expect(plan.map((p) => p.weekday)).toEqual([2, 3, 4, 5, 6]);
  });

  it('splits a slot by weekday when contents differ across the week', () => {
    const plan = buildNotificationPlan([
      medicine({ id: 'a', name: 'A', times: ['08:00'] }),
      medicine({ id: 'b', name: 'B', times: ['08:00'], days: 'weekend' }),
    ]);
    expect(plan).toHaveLength(7);
    const sunday = plan.find((p) => p.weekday === 1)!;
    const monday = plan.find((p) => p.weekday === 2)!;
    expect(sunday.doses.map((d) => d.medicineId)).toEqual(['a', 'b']);
    expect(monday.doses.map((d) => d.medicineId)).toEqual(['a']);
  });

  it('rings earlier by the offset and rolls over midnight to the previous weekday', () => {
    const plan = buildNotificationPlan([
      medicine({ days: [1], times: ['00:10'], notificationOffset: 30 }),
    ]);
    expect(plan).toHaveLength(1);
    // Monday 00:10 dose → Sunday 23:40 reminder, dose date is the next day.
    expect(plan[0]).toMatchObject({ weekday: 1, hour: 23, minute: 40 });
    expect(plan[0].doses[0]).toMatchObject({ doseTime: '00:10', dayShift: 1, offset: 30 });
  });

  it('skips inactive medicines', () => {
    expect(buildNotificationPlan([medicine({ isActive: false })])).toEqual([]);
  });

  it('stays well under the iOS 64-notification cap for a heavy daily regimen', () => {
    const meds = Array.from({ length: 10 }, (_, i) =>
      medicine({ id: `m${i}`, times: ['08:00', '12:00', '18:00', '22:00'] })
    );
    expect(buildNotificationPlan(meds)).toHaveLength(4);
  });

  it('falls back to a compact plan when the merged one exceeds the budget', () => {
    // An everyday and a weekday medicine at the same times: merged = 7 per time.
    const meds = [
      medicine({ id: 'a', name: 'A', times: ['08:00', '20:00'] }),
      medicine({ id: 'b', name: 'B', times: ['08:00', '20:00'], days: 'weekday' }),
    ];
    expect(buildNotificationPlan(meds)).toHaveLength(14);

    const compact = buildNotificationPlan(meds, 10);
    // Per time: one DAILY for A, plus five weekday WEEKLY for B.
    expect(compact).toHaveLength(12);
    const daily = compact.filter((p) => p.weekday === null);
    expect(daily.map((p) => p.doses.map((d) => d.medicineId))).toEqual([['a'], ['a']]);
    expect(compact.filter((p) => p.weekday !== null).every((p) => p.doses[0].medicineId === 'b')).toBe(true);
  });

  it('covers every scheduled dose in the compact plan', () => {
    const meds = [
      medicine({ id: 'a', name: 'A', times: ['08:00'] }),
      medicine({ id: 'b', name: 'B', times: ['08:00'], days: [1, 3] }),
    ];
    const plan = buildNotificationPlan(meds, 1);
    const ringsOn = (id: string, weekday: number) =>
      plan.some((p) => (p.weekday === null || p.weekday === weekday) && p.doses.some((d) => d.medicineId === id));
    for (let w = 1; w <= 7; w++) expect(ringsOn('a', w)).toBe(true);
    expect(ringsOn('b', 2)).toBe(true); // Monday
    expect(ringsOn('b', 4)).toBe(true); // Wednesday
    expect(ringsOn('b', 3)).toBe(false);
  });
});

