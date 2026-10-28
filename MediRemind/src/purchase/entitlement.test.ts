import { describe, expect, it } from '@jest/globals';
import { computeEntitlement } from './entitlement';

const DAY = 24 * 60 * 60 * 1000;
const start = new Date(2026, 2, 1).getTime(); // local midnight

describe('computeEntitlement', () => {
  it('is pro once purchased, regardless of trial', () => {
    expect(computeEntitlement(true, null, start, 7).status).toBe('pro');
    expect(computeEntitlement(true, start, start + 100 * DAY, 7).status).toBe('pro');
  });

  it('is new until the trial is started', () => {
    expect(computeEntitlement(false, null, start + 30 * DAY, 7)).toEqual({ status: 'new', trialDaysLeft: 0 });
  });

  it('counts the 7-day trial down by calendar day', () => {
    expect(computeEntitlement(false, start, start + 1000, 7)).toEqual({ status: 'trial', trialDaysLeft: 7 });
    expect(computeEntitlement(false, start, start + DAY + 1000, 7).trialDaysLeft).toBe(6);
    expect(computeEntitlement(false, start, start + 6 * DAY + 1000, 7).trialDaysLeft).toBe(1);
  });

  it('locks on day 8', () => {
    expect(computeEntitlement(false, start, start + 7 * DAY, 7)).toEqual({ status: 'locked', trialDaysLeft: 0 });
  });
});
