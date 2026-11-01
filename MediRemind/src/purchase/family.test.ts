import { describe, expect, it } from '@jest/globals';
import { familyAccess, originalDate, subscriptionFrom, yearlySaving } from './family';
import { LEGACY_FULL_CUTOFF } from './purchase.config';

const now = LEGACY_FULL_CUTOFF + 30 * 86400000;
const sub = { productId: 'family_yearly', expiresAt: now + 86400000, trial: false, willRenew: true };

describe('familyAccess', () => {
  it('keeps family alerts for full-version owners from before the plan', () => {
    expect(familyAccess(true, LEGACY_FULL_CUTOFF - 1, null, now)).toEqual({ kind: 'legacy' });
    expect(familyAccess(true, null, null, now)).toEqual({ kind: 'legacy' });
  });

  it('needs the subscription for later full-version buyers', () => {
    expect(familyAccess(true, LEGACY_FULL_CUTOFF + 1, null, now)).toEqual({ kind: 'none' });
    expect(familyAccess(true, LEGACY_FULL_CUTOFF + 1, sub, now)).toEqual({ kind: 'subscribed', subscription: sub });
  });

  it('ends when the subscription period is over', () => {
    expect(familyAccess(false, null, { ...sub, expiresAt: now - 1 }, now)).toEqual({ kind: 'none' });
  });
});

describe('store transactions', () => {
  it('picks the live family subscription with the latest expiry', () => {
    const s = subscriptionFrom(
      [
        { productId: '01', transactionDate: 1 },
        { productId: 'family_monthly', transactionDate: 1, expirationDateIOS: now - 5 },
        { productId: 'family_monthly', transactionDate: 2, expirationDateIOS: now + 50, offerIOS: { paymentMode: 'FREE_TRIAL' } },
        { productId: 'family_yearly', transactionDate: 3, expirationDateIOS: now + 10, isAutoRenewing: false },
      ],
      now
    );
    expect(s).toEqual({ productId: 'family_monthly', expiresAt: now + 50, trial: true, willRenew: true });
    expect(subscriptionFrom([], now)).toBeNull();
  });

  it('uses the original purchase date of a restored product', () => {
    expect(originalDate([{ productId: '01', transactionDate: 900, originalTransactionDateIOS: 500 }], '01')).toBe(500);
    expect(originalDate([{ productId: '01', transactionDate: 900 }], '01')).toBe(900);
    expect(originalDate([], '01')).toBeNull();
  });

  it('works out the yearly saving', () => {
    const plan = (period: 'year' | 'month', price: number) => ({ id: period, period, price, priceLabel: '', available: true });
    expect(yearlySaving([plan('year', 12000), plan('month', 1500)])).toBe(33);
    expect(yearlySaving([plan('year', 12000)])).toBeNull();
  });
});
