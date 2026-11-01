/** Pure rules for who gets family alerts, kept apart from the store code for tests. */
import { FAMILY_PLAN_IDS, LEGACY_FULL_CUTOFF } from './purchase.config';
import type { FamilyPlanProduct, FamilySubscription } from './types';

export type FamilyAccess =
  | { kind: 'none' }
  | { kind: 'legacy' }
  | { kind: 'subscribed'; subscription: FamilySubscription };

/**
 * Full-version owners from before the family plan keep it for life. An owner
 * whose purchase date isn't known yet (first launch offline) gets the benefit
 * of the doubt until the store answers.
 */
export function familyAccess(
  isPro: boolean,
  fullDate: number | null,
  subscription: FamilySubscription | null,
  now: number
): FamilyAccess {
  if (isPro && (fullDate === null || fullDate < LEGACY_FULL_CUTOFF)) return { kind: 'legacy' };
  if (subscription && subscription.expiresAt > now) return { kind: 'subscribed', subscription };
  return { kind: 'none' };
}

/** Minimal shape of a store transaction, so this stays independent of react-native-iap. */
export interface StoreTransaction {
  productId: string;
  transactionDate: number;
  originalTransactionDateIOS?: number | null;
  expirationDateIOS?: number | null;
  isAutoRenewing?: boolean;
  offerIOS?: { paymentMode?: string; type?: string } | null;
}

/** The live family subscription among the store's transactions, latest expiry first. */
export function subscriptionFrom(purchases: StoreTransaction[], now: number): FamilySubscription | null {
  let best: FamilySubscription | null = null;
  for (const p of purchases) {
    if (!FAMILY_PLAN_IDS.includes(p.productId)) continue;
    const expiresAt = p.expirationDateIOS ?? 0;
    if (expiresAt <= now || (best && best.expiresAt >= expiresAt)) continue;
    best = {
      productId: p.productId,
      expiresAt,
      trial: /free/i.test(p.offerIOS?.paymentMode ?? ''),
      willRenew: p.isAutoRenewing ?? true,
    };
  }
  return best;
}

/** Earliest purchase date of a product: restored copies carry the original date separately. */
export function originalDate(purchases: StoreTransaction[], productId: string): number | null {
  const dates = purchases
    .filter((p) => p.productId === productId)
    .map((p) => p.originalTransactionDateIOS || p.transactionDate)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  return dates.length ? Math.min(...dates) : null;
}

/** Percent saved by paying yearly instead of monthly, or null if prices are unknown. */
export function yearlySaving(plans: FamilyPlanProduct[]): number | null {
  const year = plans.find((p) => p.period === 'year')?.price;
  const month = plans.find((p) => p.period === 'month')?.price;
  if (!year || !month) return null;
  const pct = Math.round((1 - year / (month * 12)) * 100);
  return pct > 0 ? pct : null;
}
