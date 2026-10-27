/**
 * Selects the active PurchaseProvider for the app.
 *
 * - Dev / Expo Go / simulator (`__DEV__`): the mock provider, so the full
 *   purchase + entitlement UX runs without the native StoreKit/Play module.
 * - Release builds: the real `react-native-iap` provider (see realProvider.ts
 *   and docs/IAP_SETUP.md). The store product `com.csparkzxc.mediremind.full`
 *   must exist and pass sandbox testing before submission.
 *
 * Everything else in the app depends only on the PurchaseProvider interface, so
 * this single switch is all that changes between mock and real billing.
 */
import { mockPurchaseProvider } from './mockProvider';
import { realPurchaseProvider } from './realProvider';
import type { PurchaseProvider } from './types';

/** Real store billing in release builds; mock while developing. */
export const USE_REAL_IAP = !__DEV__;

export const activeProvider: PurchaseProvider = USE_REAL_IAP
  ? realPurchaseProvider
  : mockPurchaseProvider;
