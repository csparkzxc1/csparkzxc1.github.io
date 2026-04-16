import { differenceInDays, parseISO, addDays, format } from 'date-fns';
import { Prescription } from '../types';

/**
 * Returns the number of days remaining until the prescription ends.
 * Negative if already expired.
 */
export function getDaysUntilPrescriptionEnd(prescription: Prescription): number {
  const endDate = addDays(parseISO(prescription.startDate), prescription.totalDays);
  return differenceInDays(endDate, new Date());
}

/**
 * Returns 'D-N', 'D-Day', or 'D+N' string for display.
 */
export function prescriptionDDayLabel(prescription: Prescription): string {
  const days = getDaysUntilPrescriptionEnd(prescription);
  if (days > 0) return `D-${days}`;
  if (days === 0) return 'D-Day';
  return `D+${Math.abs(days)}`;
}

/**
 * Returns true if prescription is expiring within the given number of days.
 */
export function isPrescriptionExpiringSoon(
  prescription: Prescription,
  withinDays: number = 7
): boolean {
  const days = getDaysUntilPrescriptionEnd(prescription);
  return days >= 0 && days <= withinDays;
}

/**
 * Returns true if the prescription has already expired.
 */
export function isPrescriptionExpired(prescription: Prescription): boolean {
  return getDaysUntilPrescriptionEnd(prescription) < 0;
}

/**
 * Returns the end date of the prescription as a formatted string.
 */
export function prescriptionEndDateStr(prescription: Prescription): string {
  const endDate = addDays(parseISO(prescription.startDate), prescription.totalDays);
  return format(endDate, 'yyyy-MM-dd');
}
