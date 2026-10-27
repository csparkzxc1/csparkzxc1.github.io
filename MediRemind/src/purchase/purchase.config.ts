/**
 * One-time "full version" purchase. The product id must match the
 * non-consumable in-app purchase created in App Store Connect.
 */
export const PURCHASE_CONFIG = {
  productId: 'com.csparkzxc.mediremind.full',
  productTitle: 'MediRemind 정식 버전',
  /** Shown only when the store price can't be fetched (mock / offline). */
  fallbackPriceLabel: '₩2,200',
  trialDays: 7,
} as const;

export const PURCHASE_KEYS = {
  purchased: 'purchase.purchased',
  purchasedAt: 'purchase.purchasedAt',
  firstLaunchAt: 'purchase.firstLaunchAt',
} as const;

/** Epoch millis of local midnight, so the trial counts down by calendar day. */
export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
