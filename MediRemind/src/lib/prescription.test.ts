import { describe, expect, it } from '@jest/globals';
import {
  daysUntilPrescriptionEnd,
  isPrescriptionExpiringSoon,
  isValidDateKey,
  prescriptionDDayLabel,
} from './prescription';

const presc = { startDate: '2026-03-01', totalDays: 30, alertDays: [7] };

describe('prescription', () => {
  it('counts calendar days to the end date', () => {
    expect(daysUntilPrescriptionEnd(presc, new Date(2026, 2, 1, 23, 0))).toBe(30);
    expect(daysUntilPrescriptionEnd(presc, new Date(2026, 2, 31, 8, 0))).toBe(0);
  });

  it('labels D-day', () => {
    expect(prescriptionDDayLabel(presc, new Date(2026, 2, 28))).toBe('D-3');
    expect(prescriptionDDayLabel(presc, new Date(2026, 2, 31))).toBe('D-Day');
    expect(prescriptionDDayLabel(presc, new Date(2026, 3, 2))).toBe('D+2');
  });

  it('flags prescriptions ending within a week', () => {
    expect(isPrescriptionExpiringSoon(presc, 7, new Date(2026, 2, 25))).toBe(true);
    expect(isPrescriptionExpiringSoon(presc, 7, new Date(2026, 2, 10))).toBe(false);
  });

  it('accepts only real calendar dates', () => {
    expect(isValidDateKey('2026-02-28')).toBe(true);
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('2026-13-01')).toBe(false);
    expect(isValidDateKey('2026-1-01')).toBe(false);
  });
});
