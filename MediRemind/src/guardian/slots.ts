/**
 * The dose slots a patient shares with their guardians: every scheduled dose
 * from today through the next few days, with its absolute due time so the
 * server can tell when one is overdue without knowing the schedule rules.
 */
import type { DoseRecord, Medicine } from '../types';
import { addDays, dateRange, expectedDoseRecords, parseDateKey } from '../lib/schedule';
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

/** Mirrors the server: a dose is reported missed 30 minutes after it was due. */
export const MISSED_AFTER_MIN = 30;

export function slotState(slot: Pick<DoseSlot, 'due_at' | 'taken_at'>, now: Date): SlotState {
  if (slot.taken_at) return 'taken';
  const overdueMin = (now.getTime() - new Date(slot.due_at).getTime()) / 60000;
  if (overdueMin < 0) return 'upcoming';
  return overdueMin < MISSED_AFTER_MIN ? 'late' : 'missed';
}
