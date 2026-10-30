/**
 * The dose slots a patient shares with their guardians: every scheduled dose
 * from today through the next few days, with its absolute due time so the
 * server can tell when one is overdue without knowing the schedule rules.
 */
import type { DoseRecord, Medicine } from '../types';
import { addDays, dateKey, dateRange, expectedDoseRecords, parseDateKey } from '../lib/schedule';
import { parseTime } from '../lib/time';

/** Uploaded ahead so alerts still work if the app isn't opened for a while. */
export const SLOT_DAYS = 7;

export interface DoseSlot {
  id: string;
  medicine_name: string;
  /** ISO timestamp of the scheduled dose time. */
  due_at: string;
  taken_at: string | null;
}

export function dueAt(date: string, time: string): Date {
  const d = parseDateKey(date);
  const { hour, minute } = parseTime(time);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Slots for `today` and the following days; taken state comes from the local
 * records (only today can have any).
 */
export function buildSlots(
  medicines: Medicine[],
  records: DoseRecord[],
  today: string,
  days = SLOT_DAYS
): DoseSlot[] {
  const taken = new Map(records.filter((r) => r.isTaken).map((r) => [r.id, r.takenAt]));
  const names = new Map(medicines.map((m) => [m.id, m.name]));
  const out: DoseSlot[] = [];
  for (const date of dateRange(today, addDays(today, days - 1))) {
    for (const r of expectedDoseRecords(medicines, date)) {
      out.push({
        id: r.id,
        medicine_name: names.get(r.medicineId) ?? '',
        due_at: dueAt(date, r.scheduledTime).toISOString(),
        taken_at: taken.get(r.id) ?? null,
      });
    }
  }
  return out;
}

export type SlotState = 'taken' | 'upcoming' | 'late' | 'missed';

/** Minutes after a dose's time a guardian can choose to be alerted. */
export const ALERT_DELAYS = [5, 10, 15, 30, 60, 120] as const;
export const DEFAULT_ALERT_DELAY = 30;

/** Mirrors the server: a dose counts as missed once the guardian's delay has passed. */
export function slotState(
  slot: Pick<DoseSlot, 'due_at' | 'taken_at'>,
  now: Date,
  delayMin: number = DEFAULT_ALERT_DELAY
): SlotState {
  if (slot.taken_at) return 'taken';
  const overdueMin = (now.getTime() - new Date(slot.due_at).getTime()) / 60000;
  if (overdueMin < 0) return 'upcoming';
  return overdueMin < delayMin ? 'late' : 'missed';
}

/** Days of history a guardian sees (the server keeps 14). */
export const HISTORY_DAYS = 14;

export interface DayTally {
  date: string;
  total: number;
  taken: number;
  /** Untaken doses past the guardian's delay. */
  missed: number;
}

/** Per-day counts for the `days` days ending today, oldest first. */
export function dailyTally(
  slots: Pick<DoseSlot, 'due_at' | 'taken_at'>[],
  today: string,
  now: Date,
  delayMin: number = DEFAULT_ALERT_DELAY,
  days = HISTORY_DAYS
): DayTally[] {
  const out = new Map<string, DayTally>();
  for (const date of dateRange(addDays(today, -(days - 1)), today)) {
    out.set(date, { date, total: 0, taken: 0, missed: 0 });
  }
  for (const slot of slots) {
    const day = out.get(dateKey(new Date(slot.due_at)));
    if (!day) continue;
    day.total += 1;
    const state = slotState(slot, now, delayMin);
    if (state === 'taken') day.taken += 1;
    else if (state === 'missed') day.missed += 1;
  }
  return [...out.values()];
}

/** Share of due doses taken over the tallied days (upcoming doses excluded), or null. */
export function adherenceRate(tally: DayTally[]): number | null {
  const due = tally.reduce((n, d) => n + d.taken + d.missed, 0);
  if (!due) return null;
  return Math.round((tally.reduce((n, d) => n + d.taken, 0) / due) * 100);
}
