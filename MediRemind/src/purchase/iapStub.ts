/**
 * Build-time stub for `react-native-iap` used ONLY in Expo Go (and any client
 * without the native StoreKit/Play module). metro.config.js aliases
 * `react-native-iap` to this file when EXPO_PUBLIC_IAP=mock, so the native
 * package is never bundled or evaluated in Expo Go.
 *
 * These functions are never actually called: in dev, provider.ts selects the
 * mock provider (USE_REAL_IAP = !__DEV__), so realProvider's methods don't run.
 * They exist only so realProvider.ts can import the same symbol names and the
 * bundle resolves without the native module. Release/EAS builds do NOT set the
 * env flag, so they bundle the real `react-native-iap`.
 */

const notAvailable = (name: string) => () => {
  throw new Error(
    `[iapStub] react-native-iap.${name}() is unavailable in Expo Go. ` +
      'In-app purchases require a development or release build.'
  );
};

export const initConnection = notAvailable('initConnection');
export const endConnection = notAvailable('endConnection');
export const fetchProducts = notAvailable('fetchProducts');
export const requestPurchase = notAvailable('requestPurchase');
export const getAvailablePurchases = notAvailable('getAvailablePurchases');
export const finishTransaction = notAvailable('finishTransaction');

type Subscription = { remove: () => void };

export const purchaseUpdatedListener = (
  _listener: (purchase: unknown) => void
): Subscription => ({ remove: () => {} });

export const purchaseErrorListener = (
  _listener: (error: unknown) => void
): Subscription => ({ remove: () => {} });

// Types are erased at build time; provided here so `import type { Purchase,
// PurchaseError }` resolves against the alias.
export type Purchase = Record<string, unknown>;
export type PurchaseError = Record<string, unknown>;
