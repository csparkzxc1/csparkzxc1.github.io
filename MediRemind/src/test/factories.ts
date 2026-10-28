import type { DoseRecord, Medicine } from '../types';

export function medicine(overrides: Partial<Medicine> = {}): Medicine {
  return {
    id: 'm1',
    name: 'Med',
    dosage: '1정',
    times: ['08:00'],
    days: 'everyday',
    color: '#4A6CF7',
    memo: '',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    prescription: null,
    notificationOffset: 0,
    ...overrides,
  };
}

export function dose(date: string, isTaken: boolean, overrides: Partial<DoseRecord> = {}): DoseRecord {
  return {
    id: `m1_${date}_0800`,
    medicineId: 'm1',
    scheduledTime: '08:00',
    takenAt: isTaken ? `${date}T08:01:00.000Z` : null,
    date,
    isTaken,
    ...overrides,
  };
}
