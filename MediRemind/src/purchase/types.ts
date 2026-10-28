/**
 * Purchase abstraction. The app talks only to this interface; a mock backs it
 * in development and `react-native-iap` in release builds (provider.ts).
 */

export type EntitlementStatus = 'free' | 'pro';

export interface PurchaseProduct {
  id: string;
  title: string;
  /** Localized price from the store, or the configured fallback. */
  priceLabel: string;
  /** False when the store returned nothing (agreement, review, offline). */
  available?: boolean;
}

export interface PurchaseProvider {
  init(): Promise<void>;
  getProduct(): Promise<PurchaseProduct>;
  isPurchased(): Promise<boolean>;
  /** Buys the full version. Resolves true if completed, false if cancelled. */
  purchase(): Promise<boolean>;
  /** Restores the full version. True if a purchase was found. */
  restore(): Promise<boolean>;
}
