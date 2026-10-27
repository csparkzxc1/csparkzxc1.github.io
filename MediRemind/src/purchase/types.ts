/**
 * Purchase abstraction.
 *
 * The app talks only to this interface; the concrete implementation is a mock
 * today and a real `react-native-iap` provider in production (see
 * docs/IAP_SETUP.md). Swapping providers must not require touching the UI
 * or entitlement logic.
 */

/** Whether the user currently has full access, and why. */
export type EntitlementStatus = 'pro' | 'trial' | 'locked';

export interface PurchaseProduct {
  id: string;
  title: string;
  /** Localized price string from the store, or the configured fallback. */
  priceLabel: string;
  /**
   * Whether the product was actually loaded from the store. False means the
   * store returned nothing (e.g. IAP not approved, Paid Apps Agreement not in
   * effect, offline) — the paywall should warn instead of showing a dead button.
   */
  available?: boolean;
}

export interface PurchaseProvider {
  /** Initializes the provider and records first-launch if needed. */
  init(): Promise<void>;
  /** Returns the product to display on the paywall. */
  getProduct(): Promise<PurchaseProduct>;
  /** Whether the one-time purchase has been made (locally persisted). */
  isPurchased(): Promise<boolean>;
  /** Starts the purchase flow. Resolves true if the purchase completed. */
  purchase(): Promise<boolean>;
  /** Restores a previous purchase. Resolves true if one was restored. */
  restore(): Promise<boolean>;
  /** Epoch millis of first launch, for trial-window computation. */
  getFirstLaunchAt(): Promise<number>;
}
