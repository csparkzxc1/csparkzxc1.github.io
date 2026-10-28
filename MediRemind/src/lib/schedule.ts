/**
 * Which days a medicine is taken, and the dose records expected for a date.
 * Dates are local 'YYYY-MM-DD' strings throughout.
 */
import type { DoseRecord, Medicine } from '../types';
import { pad } from './time';

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses 'YYYY-MM-DD' as a local date (not UTC, unlike `new Date(str)`). */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

/** Inclusive list of date keys from `start` to `end`; empty if start > end. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let k = start; k <= end; k = addDays(k, 1)) out.push(k);
  return out;
}

/** Weekdays (0=Sun..6=Sat) the medicine is taken on. */
export function scheduledWeekdays(days: Medicine['days']): number[] {
  if (days === 'everyday') return [0, 1, 2, 3, 4, 5, 6];
  if (days === 'weekday') return [1, 2, 3, 4, 5];
  if (days === 'weekend') return [0, 6];
  if (Array.isArray(days)) return [...new Set(days)].filter((d) => d >= 0 && d <= 6).sort();
  return [];
}

export function isScheduledOnWeekday(medicine: Medicine, weekday: number): boolean {
  return scheduledWeekdays(medicine.days).includes(weekday);
}

export function isScheduledOnDate(medicine: Medicine, key: string): boolean {
  return isScheduledOnWeekday(medicine, parseDateKey(key).getDay());
}

export function doseRecordId(medicineId: string, date: string, time: string): string {
  return `${medicineId}_${date}_${time.replace(':', '')}`;
}

/**
 * Untaken dose records a set of medicines calls for on `date`. Medicines
 * registered after `date` are skipped so backfilling history doesn't invent
 * missed doses from before the medicine existed.
 */
export function expectedDoseRecords(medicines: Medicine[], date: string): DoseRecord[] {
  const out: DoseRecord[] = [];
  for (const med of medicines) {
    if (!med.isActive) continue;
    if (!isScheduledOnDate(med, date)) continue;
    if (createdDateKey(med) > date) continue;
    for (const time of med.times) {
      out.push({
        id: doseRecordId(med.id, date, time),
        medicineId: med.id,
        scheduledTime: time,
        takenAt: null,
        date,
        isTaken: false,
      });
    }
  }
  return out;
}

function createdDateKey(med: Medicine): string {
  const d = new Date(med.createdAt);
  return Number.isNaN(d.getTime()) ? '0000-00-00' : dateKey(d);
}
