/**
 * App Store / Play purchases through `react-native-iap` v15: one non-consumable
 * "full version" that lifts the free medicine limit.
 *
 * No server: the store's purchase history is the source of truth and is
 * mirrored into the local kv table for offline reads.
 *
 * v15 reports results through purchaseUpdatedListener/purchaseErrorListener,
 * not the return value of requestPurchase, so each request is bridged back to
 * a promise. Needs a dev/standalone build and a StoreKit
 * sandbox check before submission.
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
import { PURCHASE_CONFIG, PURCHASE_KEYS } from './purchase.config';
import type { PurchaseProduct, PurchaseProvider } from './types';

const FULL = PURCHASE_CONFIG.productId;

let connected = false;
let listenersBound = false;

interface Pending {
  sku: string;
  resolve: (ok: boolean) => void;
  reject: (e: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}
let pending: Pending | null = null;

async function ensureConnection(): Promise<void> {
  if (!connected) {
    await initConnection();
    connected = true;
  }
}

const changeListeners = new Set<() => void>();

async function markPurchased(): Promise<void> {
  await kvSet(PURCHASE_KEYS.purchased, '1');
  await kvSet(PURCHASE_KEYS.purchasedAt, String(Date.now()));
  changeListeners.forEach((l) => l());
}

async function applyHistory(purchases: Purchase[]): Promise<boolean> {
  const full = purchases.some((p) => p.productId === FULL);
  if (full) await markPurchased();
  return full;
}

function take(sku: string): Pending | null {
  if (!pending || pending.sku !== sku) return null;
  const p = pending;
  pending = null;
  clearTimeout(p.timer);
  return p;
}

function isUserCancel(error: PurchaseError | undefined): boolean {
  const code = (error as { code?: string } | undefined)?.code ?? '';
  const msg = (error as { message?: string } | undefined)?.message ?? '';
  return /cancel/i.test(code) || /cancel/i.test(msg);
}

function errorCode(error: unknown): string {
  return String((error as { code?: string } | undefined)?.code ?? '');
}

/** A store error carrying its code so the paywall can explain what went wrong. */
export class PurchaseFailure extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

/**
 * Settles a failed request. "Already owned" means the store holds a purchase
 * the device lost track of, so it is restored instead of reported as an error.
 */
async function settleError(p: Pending, error: unknown): Promise<void> {
  const code = errorCode(error);
  if (isUserCancel(error as PurchaseError)) return p.resolve(false);
  if (/already-owned/i.test(code)) {
    try {
      if (await applyHistory(await getAvailablePurchases())) return p.resolve(true);
    } catch (e) {
      console.warn('[iap] restore after already-owned failed', e);
    }
  }
  const message = (error as { message?: string } | undefined)?.message || 'Purchase failed';
  p.reject(new PurchaseFailure(message, code));
}

function bindListeners(): void {
  if (listenersBound) return;
  listenersBound = true;

  purchaseUpdatedListener(async (purchase: Purchase) => {
    if (purchase.productId !== FULL) return;
    // Unlock first: the user has paid even if finishing the transaction fails
    // (StoreKit redelivers unfinished transactions on the next launch).
    await markPurchased().catch((e) => console.warn('[iap] saving purchase failed', e));
    take(purchase.productId)?.resolve(true);
    try {
      // Non-consumable: finish without consuming so it stays owned.
      await finishTransaction({ purchase, isConsumable: false });
    } catch (e) {
      console.warn('[iap] finishTransaction failed', e);
    }
  });

  purchaseErrorListener((error: PurchaseError) => {
    console.warn('[iap] purchase error', error?.code, error?.message);
    const p = pending;
    if (!p) return;
    pending = null;
    clearTimeout(p.timer);
    settleError(p, error);
  });
}

async function buy(sku: string): Promise<boolean> {
  await ensureConnection();
  bindListeners();
  pending?.resolve(false);
  const result = new Promise<boolean>((resolve, reject) => {
    // Stops the button spinning forever if the store never answers. Not a
    // failure: a late purchase event still unlocks via the change listeners.
    const timer = setTimeout(() => {
      if (pending?.sku === sku) {
        pending = null;
        resolve(false);
      }
    }, 90_000);
    pending = { sku, resolve, reject, timer };
  });
  try {
    await requestPurchase({
      request: { apple: { sku }, google: { skus: [sku] } },
      type: 'in-app',
    });
  } catch (e) {
    const p = take(sku);
    if (p) await settleError(p, e);
  }
  return result;
}

export const realPurchaseProvider: PurchaseProvider = {
  async init() {
    await ensureConnection();
    bindListeners();
    // Recover state from the store (reinstall, new device, Family Sharing).
    try {
      await applyHistory(await getAvailablePurchases());
    } catch (e) {
      console.warn('[iap] getAvailablePurchases on init failed', e);
    }
  },

  async getProduct(): Promise<PurchaseProduct> {
    const fallback = {
      id: FULL,
      title: PURCHASE_CONFIG.productTitle,
      priceLabel: PURCHASE_CONFIG.fallbackPriceLabel,
    };
    try {
      await ensureConnection();
      const products = await fetchProducts({ skus: [FULL], type: 'in-app' });
      const p = products?.[0];
      return {
        id: FULL,
        title: p?.title ?? fallback.title,
        priceLabel: p?.displayPrice ?? fallback.priceLabel,
        available: !!p,
      };
    } catch (e) {
      console.warn('[iap] fetchProducts failed', e);
      return { ...fallback, available: false };
    }
  },

  async isPurchased() {
    return (await kvGet(PURCHASE_KEYS.purchased)) === '1';
  },

  purchase: () => buy(FULL),

  subscribe(listener) {
    changeListeners.add(listener);
    return () => {
      changeListeners.delete(listener);
    };
  },

  async restore() {
    await ensureConnection();
    return applyHistory(await getAvailablePurchases());
  },
};

export { endConnection };
