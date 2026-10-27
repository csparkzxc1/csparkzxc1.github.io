/**
 * Real in-app purchase provider backed by `react-native-iap` (v15, StoreKit 2 /
 * Play Billing). Implements the same PurchaseProvider interface as the mock, so
 * nothing else in the app changes — `provider.ts` selects this in release builds.
 *
 * No backend: entitlement is the store's own purchase record. We mirror it into
 * the local `kv` table for fast offline reads, but `getAvailablePurchases()`
 * (restore) is always the source of truth on reinstall / device transfer.
 * No server is needed.
 *
 * NOTE: v15 delivers purchase results through `purchaseUpdatedListener`, NOT the
 * return value of `requestPurchase`. We bridge that event back to the
 * promise-based interface below. Requires a dev/standalone build (native module)
 * and MUST be verified against a StoreKit sandbox account before submission.
 */
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';
import { kvGet, kvSet } from '../db/kv';
import { PURCHASE_CONFIG, PURCHASE_KEYS, startOfDay } from './purchase.config';
import type { PurchaseProvider, PurchaseProduct } from './types';

let connected = false;
let listenersBound = false;
/** In-flight purchase() call; the store listeners settle or fail it. */
let pendingPurchase:
  | { resolve: (ok: boolean) => void; reject: (e: unknown) => void }
  | null = null;
let purchaseTimer: ReturnType<typeof setTimeout> | null = null;

async function ensureConnection(): Promise<void> {
  if (!connected) {
    await initConnection();
    connected = true;
  }
}

async function markPurchased(): Promise<void> {
  await kvSet(PURCHASE_KEYS.purchased, '1');
  await kvSet(PURCHASE_KEYS.purchasedAt, String(Date.now()));
}

function takePending() {
  if (purchaseTimer) {
    clearTimeout(purchaseTimer);
    purchaseTimer = null;
  }
  const p = pendingPurchase;
  pendingPurchase = null;
  return p;
}

/** Resolve the in-flight purchase (true=bought, false=cancelled/no-op). */
function settlePending(ok: boolean): void {
  takePending()?.resolve(ok);
}

/** Reject the in-flight purchase so the UI can show an error. */
function failPending(e: unknown): void {
  takePending()?.reject(e);
}

function isOurProduct(productId: string | null | undefined): boolean {
  return productId === PURCHASE_CONFIG.productId;
}

/** StoreKit/Play "user cancelled" is a normal outcome, not an error. */
function isUserCancel(error: PurchaseError | undefined): boolean {
  const code = (error as { code?: string } | undefined)?.code ?? '';
  const msg = (error as { message?: string } | undefined)?.message ?? '';
  return /cancel/i.test(code) || /cancel/i.test(msg);
}

/** Binds purchase/error listeners once; safe to call repeatedly. */
function bindListeners(): void {
  if (listenersBound) return;
  listenersBound = true;

  purchaseUpdatedListener(async (purchase: Purchase) => {
    if (!isOurProduct(purchase.productId)) return;
    try {
      // Non-consumable: finish (don't consume) so it stays owned.
      await finishTransaction({ purchase, isConsumable: false });
      await markPurchased();
      settlePending(true);
    } catch (e) {
      console.error('finishTransaction failed', e);
      settlePending(false);
    }
  });

  purchaseErrorListener((error: PurchaseError) => {
    console.warn('Purchase error', error?.code, error?.message);
    // User cancellation → resolve(false) silently; real errors → reject so the
    // paywall surfaces "구매 실패" instead of looking like a dead button.
    if (isUserCancel(error)) settlePending(false);
    else failPending(new Error(error?.message || 'Purchase failed'));
  });
}

export const realPurchaseProvider: PurchaseProvider = {
  async init() {
    await ensureConnection();
    bindListeners();
    if ((await kvGet(PURCHASE_KEYS.firstLaunchAt)) == null) {
      await kvSet(PURCHASE_KEYS.firstLaunchAt, String(Date.now()));
    }
    // Recover entitlement from the store (e.g. after reinstall).
    try {
      const purchases = await getAvailablePurchases();
      if (purchases.some((p) => isOurProduct(p.productId))) {
        await markPurchased();
      }
    } catch (e) {
      console.warn('getAvailablePurchases on init failed', e);
    }
  },

  async getProduct(): Promise<PurchaseProduct> {
    await ensureConnection();
    try {
      const products = await fetchProducts({
        skus: [PURCHASE_CONFIG.productId],
        type: 'in-app',
      });
      const p = products?.[0];
      return {
        id: PURCHASE_CONFIG.productId,
        title: p?.title ?? PURCHASE_CONFIG.productTitle,
        priceLabel: p?.displayPrice ?? PURCHASE_CONFIG.fallbackPriceLabel,
        available: !!p,
      };
    } catch (e) {
      console.warn('fetchProducts failed; using fallback labels', e);
      return {
        id: PURCHASE_CONFIG.productId,
        title: PURCHASE_CONFIG.productTitle,
        priceLabel: PURCHASE_CONFIG.fallbackPriceLabel,
        available: false,
      };
    }
  },

  async isPurchased() {
    return (await kvGet(PURCHASE_KEYS.purchased)) === '1';
  },

  async purchase() {
    await ensureConnection();
    bindListeners();
    // Bridge the event-based result back to this promise. A timeout guards
    // against the native sheet never appearing (e.g. product unavailable) so
    // the paywall button can never hang forever.
    const result = new Promise<boolean>((resolve, reject) => {
      pendingPurchase = { resolve, reject };
      purchaseTimer = setTimeout(
        () => failPending(new Error('Purchase timed out')),
        90_000
      );
    });
    try {
      await requestPurchase({
        request: {
          apple: { sku: PURCHASE_CONFIG.productId },
          google: { skus: [PURCHASE_CONFIG.productId] },
        },
        type: 'in-app',
      });
    } catch (e) {
      console.warn('requestPurchase failed', e);
      failPending(e);
    }
    return result;
  },

  async restore() {
    await ensureConnection();
    const purchases = await getAvailablePurchases();
    const found = purchases.some((p) => isOurProduct(p.productId));
    if (found) await markPurchased();
    return found;
  },

  async getFirstLaunchAt() {
    const raw = await kvGet(PURCHASE_KEYS.firstLaunchAt);
    if (raw == null) {
      // Anchor to local midnight so the trial countdown decrements by calendar
      // day (7 → 6 on the next day), not by elapsed 24h windows.
      const start = startOfDay(Date.now());
      await kvSet(PURCHASE_KEYS.firstLaunchAt, String(start));
      return start;
    }
    // Normalize older values stored at a non-midnight time so the countdown is
    // calendar-day based for existing installs too.
    return startOfDay(Number(raw));
  },
};

// Optional: call on app teardown to release the store connection.
export { endConnection };
