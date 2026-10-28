import type { Prescription } from '../types';
import { addDays, dateKey, parseDateKey } from './schedule';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function prescriptionEndDate(p: Prescription): string {
  return addDays(p.startDate, p.totalDays);
}

/** Whole calendar days until the prescription runs out; negative once expired. */
export function daysUntilPrescriptionEnd(p: Prescription, now: Date = new Date()): number {
  const end = parseDateKey(prescriptionEndDate(p)).getTime();
  const today = parseDateKey(dateKey(now)).getTime();
  return Math.round((end - today) / MS_PER_DAY);
}

export function prescriptionDDayLabel(p: Prescription, now: Date = new Date()): string {
  const days = daysUntilPrescriptionEnd(p, now);
  if (days > 0) return `D-${days}`;
  if (days === 0) return 'D-Day';
  return `D+${Math.abs(days)}`;
}

export function isPrescriptionExpiringSoon(
  p: Prescription,
  withinDays = 7,
  now: Date = new Date()
): boolean {
  const days = daysUntilPrescriptionEnd(p, now);
  return days >= 0 && days <= withinDays;
}

export function isPrescriptionExpired(p: Prescription, now: Date = new Date()): boolean {
  return daysUntilPrescriptionEnd(p, now) < 0;
}

/** True for a real 'YYYY-MM-DD' calendar date (rejects 2024-02-30, 2024-13-01). */
export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return dateKey(parseDateKey(key)) === key;
}
