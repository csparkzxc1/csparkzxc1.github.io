/**
 * Mock purchase provider for development (Expo Go, simulator). Persists state
 * in the kv table and simulates the store sheet with a short delay.
 */
import { kvGet, kvSet } from '../db/kv';
import { PURCHASE_CONFIG, PURCHASE_KEYS } from './purchase.config';
import type { PurchaseProduct, PurchaseProvider } from './types';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const mockPurchaseProvider: PurchaseProvider = {
  async init() {},

  async getProduct(): Promise<PurchaseProduct> {
    return {
      id: PURCHASE_CONFIG.productId,
      title: PURCHASE_CONFIG.productTitle,
      priceLabel: PURCHASE_CONFIG.fallbackPriceLabel,
      available: true,
    };
  },

  async isPurchased() {
    return (await kvGet(PURCHASE_KEYS.purchased)) === '1';
  },

  async purchase() {
    await delay(600);
    await kvSet(PURCHASE_KEYS.purchased, '1');
    await kvSet(PURCHASE_KEYS.purchasedAt, String(Date.now()));
    return true;
  },

  async restore() {
    await delay(400);
    return (await kvGet(PURCHASE_KEYS.purchased)) === '1';
  },
};
