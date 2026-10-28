/**
 * Store products. Both ids must match non-consumable in-app purchases in App
 * Store Connect (see docs/IAP_SETUP.md).
 *
 * App Review Guideline 3.1.1: a non-subscription app may offer a time-based
 * free trial only through a Price Tier 0 non-consumable named "N-day Trial",
 * started explicitly by the user after the trial terms are shown.
 */
export const PURCHASE_CONFIG = {
  productId: 'com.csparkzxc.mediremind.full',
  productTitle: 'MediRemind 정식 버전',
  trialProductId: 'com.csparkzxc.mediremind.trial7',
  /** Shown only when the store price can't be fetched (mock / offline). */
  fallbackPriceLabel: '₩2,200',
  trialDays: 7,
} as const;

export const PURCHASE_KEYS = {
  purchased: 'purchase.purchased',
  purchasedAt: 'purchase.purchasedAt',
  trialStartedAt: 'purchase.trialStartedAt',
} as const;

/** Epoch millis of local midnight, so the trial counts down by calendar day. */
export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
