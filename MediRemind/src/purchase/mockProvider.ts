/**
 * Mock purchase provider.
 *
 * Persists entitlement locally in the kv table and simulates the store flow
 * with a short delay. Lets the whole purchase/entitlement UX run in Expo Go and
 * in CI without native modules. The real StoreKit/Play Billing implementation
 * lives behind the same PurchaseProvider interface — see docs/IAP_SETUP.md.
 */
import { kvGet, kvSet } from '../db/kv';
import { PURCHASE_CONFIG, PURCHASE_KEYS, startOfDay } from './purchase.config';
import type { PurchaseProvider, PurchaseProduct } from './types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockPurchaseProvider: PurchaseProvider = {
  async init() {
    const existing = await kvGet(PURCHASE_KEYS.firstLaunchAt);
    if (existing == null) {
      await kvSet(PURCHASE_KEYS.firstLaunchAt, String(Date.now()));
    }
  },

  async getProduct(): Promise<PurchaseProduct> {
    return {
      id: PURCHASE_CONFIG.productId,
      title: PURCHASE_CONFIG.productTitle,
      priceLabel: PURCHASE_CONFIG.fallbackPriceLabel,
      available: true,
    };
  },

  async isPurchased(): Promise<boolean> {
    return (await kvGet(PURCHASE_KEYS.purchased)) === '1';
  },

  async purchase(): Promise<boolean> {
    await delay(600); // simulate the store sheet round-trip
    await kvSet(PURCHASE_KEYS.purchased, '1');
    await kvSet(PURCHASE_KEYS.purchasedAt, String(Date.now()));
    return true;
  },

  async restore(): Promise<boolean> {
    await delay(400);
    // In the mock, "restore" simply reports whatever is persisted locally.
    return (await kvGet(PURCHASE_KEYS.purchased)) === '1';
  },

  async getFirstLaunchAt(): Promise<number> {
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
