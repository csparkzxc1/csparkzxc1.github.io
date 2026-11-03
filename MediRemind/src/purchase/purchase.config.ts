/**
 * Pricing (1.3.0):
 * - Free: up to FREE_MEDICINE_LIMIT medicines, forever.
 * - Full version: one-time non-consumable that removes the medicine limit.
 * - Family plan: auto-renewing subscription (7-day free trial) for watching
 *   family members' doses. The guardian server costs money every month, so it
 *   is the one part that is a subscription.
 *
 * Product ids must match App Store Connect exactly (see docs/IAP_SETUP.md).
 */
export const PURCHASE_CONFIG = {
  // The App Store product ID chosen at creation (fixed); the reverse-DNS name is only its reference name.
  productId: '01',
  productTitle: 'MediRemind 정식 버전',
  /** Shown only when the store price can't be fetched (mock / offline). */
  fallbackPriceLabel: '₩1,900',
} as const;

export const FREE_MEDICINE_LIMIT = 2;

export type FamilyPeriod = 'year' | 'month';

export interface FamilyPlanConfig {
  id: string;
  period: FamilyPeriod;
  fallbackPriceLabel: string;
  fallbackPrice: number;
}

/** Yearly first: it is the one selected by default. */
export const FAMILY_PLANS: FamilyPlanConfig[] = [
  { id: 'family_yearly', period: 'year', fallbackPriceLabel: '₩12,000', fallbackPrice: 12000 },
  { id: 'family_monthly', period: 'month', fallbackPriceLabel: '₩1,500', fallbackPrice: 1500 },
];

export const FAMILY_PLAN_IDS = FAMILY_PLANS.map((p) => p.id);

/**
 * 1.2.0 sold the full version as "includes every future feature", so anyone
 * who bought it before the family plan existed keeps family alerts for life.
 * Set this to the day 1.3.0 goes live (erring later is the safe side).
 */
export const LEGACY_FULL_CUTOFF = Date.parse('2027-01-01T00:00:00+09:00');

/** Apple's standard licence agreement, linked from the subscription screen. */
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export const PURCHASE_KEYS = {
  purchased: 'purchase.purchased',
  purchasedAt: 'purchase.purchasedAt',
  /** When the full version was originally bought (ms), for the legacy check. */
  fullDate: 'purchase.fullDate',
  /** Cached family subscription, so it reads offline: JSON FamilyStatus. */
  family: 'purchase.family',
} as const;
