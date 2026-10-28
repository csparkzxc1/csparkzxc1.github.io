/**
 * Purchase abstraction. The app talks only to this interface; a mock backs it
 * in development and `react-native-iap` in release builds (provider.ts).
 */

/** 'new' = trial not started yet; the trial intro screen is shown. */
export type EntitlementStatus = 'new' | 'trial' | 'locked' | 'pro';

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
  /** Restores the full version (and the trial start). True if the full version was found. */
  restore(): Promise<boolean>;
  /** Starts the free trial. Resolves true if started, false if cancelled. */
  startTrial(): Promise<boolean>;
  /** Local-midnight epoch millis the trial started, or null if never started. */
  getTrialStartedAt(): Promise<number | null>;
}
