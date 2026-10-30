/**
 * My own adherence report, from the dose records on this phone: per-day counts
 * for a chart and per-medicine rates. A dose counts as missed once its time
 * has passed without being checked.
 */
import type { DoseRecord, Medicine } from '../types';
import { dailyTally, dueAt, type DayTally } from '../guardian/slots';
import { addDays } from './schedule';

function asSlot(r: DoseRecord) {
  return {
    due_at: dueAt(r.date, r.scheduledTime).toISOString(),
    taken_at: r.isTaken ? (r.takenAt ?? dueAt(r.date, r.scheduledTime).toISOString()) : null,
  };
}

/** Per-day counts for the `days` days ending `today`, oldest first. */
export function recordTally(records: DoseRecord[], today: string, now: Date, days: number): DayTally[] {
  return dailyTally(records.map(asSlot), today, now, 0, days);
}

export interface MedicineRate {
  id: string;
  name: string;
  color: string;
  taken: number;
  /** Doses whose time has passed (taken or not). */
  due: number;
  rate: number | null;
}

/** Each medicine's share of due doses taken over the period, best first. */
export function medicineRates(
  records: DoseRecord[],
  medicines: Medicine[],
  today: string,
  now: Date,
  days: number
): MedicineRate[] {
  const from = addDays(today, -(days - 1));
  const byId = new Map<string, MedicineRate>();
  for (const r of records) {
    if (r.date < from || r.date > today) continue;
    const med = medicines.find((m) => m.id === r.medicineId);
    if (!med) continue;
    const row = byId.get(med.id) ?? { id: med.id, name: med.name, color: med.color, taken: 0, due: 0, rate: null };
    const isDue = r.isTaken || dueAt(r.date, r.scheduledTime) <= now;
    if (isDue) {
      row.due += 1;
      if (r.isTaken) row.taken += 1;
    }
    byId.set(med.id, row);
  }
  return [...byId.values()]
    .map((row) => ({ ...row, rate: row.due ? Math.round((row.taken / row.due) * 100) : null }))
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
}
