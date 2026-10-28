import { describe, expect, it } from '@jest/globals';
import { canAddMedicine } from './limits';

describe('canAddMedicine', () => {
  it('lets free users add up to two medicines', () => {
    expect(canAddMedicine(false, 0)).toBe(true);
    expect(canAddMedicine(false, 1)).toBe(true);
    expect(canAddMedicine(false, 2)).toBe(false);
    expect(canAddMedicine(false, 5)).toBe(false);
  });

  it('has no limit for the full version', () => {
    expect(canAddMedicine(true, 2)).toBe(true);
    expect(canAddMedicine(true, 50)).toBe(true);
  });
});
