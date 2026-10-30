import { describe, expect, it } from '@jest/globals';
import { medicineRates, recordTally } from './report';
import { dueAt } from '../guardian/slots';
import { adherenceRate } from '../guardian/slots';
import { dose, medicine } from '../test/factories';

describe('report', () => {
  const now = dueAt('2026-11-04', '12:00');
  const records = [
    dose('2026-11-03', true),
    dose('2026-11-03', false, { id: 'm1_2026-11-03_2000', scheduledTime: '20:00' }),
    dose('2026-11-04', true),
    dose('2026-11-04', false, { id: 'm1_2026-11-04_2000', scheduledTime: '20:00' }), // later today
    dose('2026-11-04', false, { id: 'm2_2026-11-04_0800', medicineId: 'm2' }),
  ];
  const meds = [medicine(), medicine({ id: 'm2', name: 'Vitamin', color: '#10B981' })];

  it('tallies days with untaken past doses as missed', () => {
    const tally = recordTally(records, '2026-11-04', now, 2);
    expect(tally).toEqual([
      { date: '2026-11-03', total: 2, taken: 1, missed: 1 },
      { date: '2026-11-04', total: 3, taken: 1, missed: 1 },
    ]);
    expect(adherenceRate(tally)).toBe(50);
  });

  it('rates each medicine on doses already due', () => {
    expect(medicineRates(records, meds, '2026-11-04', now, 2)).toEqual([
      { id: 'm1', name: 'Med', color: '#4A6CF7', taken: 2, due: 3, rate: 67 },
      { id: 'm2', name: 'Vitamin', color: '#10B981', taken: 0, due: 1, rate: 0 },
    ]);
  });
});
