/**
 * App Store / Play purchases through `react-native-iap` v15. Two non-consumables:
 * the full version and a ₩0 "7-day Trial" whose transaction date anchors the
 * trial, so reinstalling doesn't restart it.
 *
 * No server: the store's purchase history is the source of truth and is
 * mirrored into the local kv table for offline reads.
 *
 * v15 reports results through purchaseUpdatedListener/purchaseErrorListener,
 * not the return value of requestPurchase, so each request is bridged back to
 * a promise keyed by product id. Needs a dev/standalone build and a StoreKit
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
import { PURCHASE_CONFIG, PURCHASE_KEYS, startOfDay } from './purchase.config';
import type { PurchaseProduct, PurchaseProvider } from './types';

const FULL = PURCHASE_CONFIG.productId;
const TRIAL = PURCHASE_CONFIG.trialProductId;

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

async function markPurchased(): Promise<void> {
  await kvSet(PURCHASE_KEYS.purchased, '1');
  await kvSet(PURCHASE_KEYS.purchasedAt, String(Date.now()));
}

/** Records the trial start, keeping the earliest date seen. */
async function markTrialStarted(at: number): Promise<void> {
  const day = startOfDay(Number.isFinite(at) && at > 0 ? at : Date.now());
  const raw = await kvGet(PURCHASE_KEYS.trialStartedAt);
  if (raw == null || day < Number(raw)) await kvSet(PURCHASE_KEYS.trialStartedAt, String(day));
}

async function applyHistory(purchases: Purchase[]): Promise<boolean> {
  let full = false;
  for (const p of purchases) {
    if (p.productId === FULL) full = true;
    if (p.productId === TRIAL) await markTrialStarted(p.transactionDate);
  }
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

function bindListeners(): void {
  if (listenersBound) return;
  listenersBound = true;

  purchaseUpdatedListener(async (purchase: Purchase) => {
    if (purchase.productId !== FULL && purchase.productId !== TRIAL) return;
    try {
      // Non-consumable: finish without consuming so it stays owned.
      await finishTransaction({ purchase, isConsumable: false });
      if (purchase.productId === FULL) await markPurchased();
      else await markTrialStarted(purchase.transactionDate);
      take(purchase.productId)?.resolve(true);
    } catch (e) {
      console.warn('[iap] finishTransaction failed', e);
      take(purchase.productId)?.resolve(false);
    }
  });

  purchaseErrorListener((error: PurchaseError) => {
    console.warn('[iap] purchase error', error?.code, error?.message);
    const p = pending;
    if (!p) return;
    pending = null;
    clearTimeout(p.timer);
    // Cancelling is a normal outcome; real errors surface as "purchase failed".
    if (isUserCancel(error)) p.resolve(false);
    else p.reject(new Error(error?.message || 'Purchase failed'));
  });
}

async function buy(sku: string): Promise<boolean> {
  await ensureConnection();
  bindListeners();
  pending?.resolve(false);
  const result = new Promise<boolean>((resolve, reject) => {
    // Guards against the store sheet never appearing (e.g. product unavailable).
    const timer = setTimeout(() => {
      if (pending?.sku === sku) {
        pending = null;
        reject(new Error('Purchase timed out'));
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
    if (isUserCancel(e as PurchaseError)) p?.resolve(false);
    else p?.reject(e);
  }
  return result;
}

export const realPurchaseProvider: PurchaseProvider = {
  async init() {
    await ensureConnection();
    bindListeners();
    // Recover state from the store (reinstall, new device).
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

  async restore() {
    await ensureConnection();
    return applyHistory(await getAvailablePurchases());
  },

  async startTrial() {
    try {
      return await buy(TRIAL);
    } catch (e) {
      // If the trial product can't be bought (offline, not yet approved), the
      // user shouldn't be stuck: start the trial locally instead.
      console.warn('[iap] trial purchase failed; starting locally', e);
      await markTrialStarted(Date.now());
      return true;
    }
  },

  async getTrialStartedAt() {
    const raw = await kvGet(PURCHASE_KEYS.trialStartedAt);
    return raw == null ? null : startOfDay(Number(raw));
  },
};

export { endConnection };
