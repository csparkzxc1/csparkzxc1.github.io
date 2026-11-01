/**
 * Purchase abstraction. The app talks only to this interface; a mock backs it
 * in development and `react-native-iap` in release builds (provider.ts).
 */
import type { FamilyPeriod } from './purchase.config';

export type EntitlementStatus = 'free' | 'pro';

export interface PurchaseProduct {
  id: string;
  title: string;
  /** Localized price from the store, or the configured fallback. */
  priceLabel: string;
  /** False when the store returned nothing (agreement, review, offline). */
  available?: boolean;
}

export interface FamilyPlanProduct {
  id: string;
  period: FamilyPeriod;
  priceLabel: string;
  /** Numeric price, for the yearly saving. */
  price: number;
  available: boolean;
}

export interface FamilyOffer {
  plans: FamilyPlanProduct[];
  /** False once this Apple ID has used the free trial. */
  trialEligible: boolean;
}

/** The family subscription as last seen in the store. */
export interface FamilySubscription {
  productId: string;
  /** End of the current period (ms). */
  expiresAt: number;
  trial: boolean;
  willRenew: boolean;
}

export interface PurchaseProvider {
  init(): Promise<void>;
  getProduct(): Promise<PurchaseProduct>;
  isPurchased(): Promise<boolean>;
  /** Buys the full version. Resolves true if completed, false if cancelled. */
  purchase(): Promise<boolean>;
  /** Restores everything bought. True if anything was found. */
  restore(): Promise<boolean>;
  /** Called when a purchase lands outside a purchase() call (late, Ask to Buy, renewal). */
  subscribe?(listener: () => void): () => void;

  getFamilyOffer(): Promise<FamilyOffer>;
  /** Cached subscription plus the original full-version purchase date. */
  getFamilyState(): Promise<{ subscription: FamilySubscription | null; fullDate: number | null }>;
  /** Re-reads the subscription from the store (renewals, cancellations). */
  refreshFamily(): Promise<void>;
  purchaseFamily(productId: string): Promise<boolean>;
  manageSubscriptions(): Promise<void>;
}
