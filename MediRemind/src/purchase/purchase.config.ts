/**
 * Freemium: up to FREE_MEDICINE_LIMIT medicines free forever; the one-time
 * "full version" non-consumable removes the limit. The product id must match
 * App Store Connect (see docs/IAP_SETUP.md).
 */
export const PURCHASE_CONFIG = {
  // The App Store product ID chosen at creation (fixed); the reverse-DNS name is only its reference name.
  productId: '01',
  productTitle: 'MediRemind 정식 버전',
  /** Shown only when the store price can't be fetched (mock / offline). */
  fallbackPriceLabel: '₩1,900',
} as const;

export const FREE_MEDICINE_LIMIT = 2;

export const PURCHASE_KEYS = {
  purchased: 'purchase.purchased',
  purchasedAt: 'purchase.purchasedAt',
} as const;
