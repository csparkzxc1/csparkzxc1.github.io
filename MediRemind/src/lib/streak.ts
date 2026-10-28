/**
 * Consecutive days on which every scheduled dose was taken.
 *
 * Days with no dose records (nothing scheduled, e.g. a weekend-only medicine
 * on a Tuesday) neither count nor break the streak. Today still being pending
 * doesn't break it either: counting starts from yesterday in that case.
 */
import type { DoseRecord } from '../types';

export type DayStatus = 'complete' | 'partial' | 'missed' | 'none';

export function dayStatuses(records: DoseRecord[]): Map<string, DayStatus> {
  const byDate = new Map<string, { taken: number; total: number }>();
  for (const r of records) {
    const s = byDate.get(r.date) ?? { taken: 0, total: 0 };
    s.total += 1;
    if (r.isTaken) s.taken += 1;
    byDate.set(r.date, s);
  }
  const out = new Map<string, DayStatus>();
  for (const [date, s] of byDate) {
    out.set(date, s.taken === s.total ? 'complete' : s.taken === 0 ? 'missed' : 'partial');
  }
  return out;
}

export function computeStreak(records: DoseRecord[], today: string): number {
  const statuses = dayStatuses(records);
  const dates = [...statuses.keys()].filter((d) => d <= today).sort().reverse();

  let streak = 0;
  for (const date of dates) {
    const status = statuses.get(date);
    if (status === 'complete') {
      streak += 1;
    } else if (date === today) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}
