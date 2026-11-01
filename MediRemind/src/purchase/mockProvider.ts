/**
 * Mock purchase provider for development (Expo Go, simulator). Persists state
 * in the kv table and simulates the store sheet with a short delay.
 */
import { Alert } from 'react-native';
import { kvGet, kvSet } from '../db/kv';
import { FAMILY_PLANS, PURCHASE_CONFIG, PURCHASE_KEYS } from './purchase.config';
import type { FamilySubscription, PurchaseProduct, PurchaseProvider } from './types';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const DAY = 86400000;

async function readFamily(): Promise<FamilySubscription | null> {
  try {
    const raw = await kvGet(PURCHASE_KEYS.family);
    return raw ? (JSON.parse(raw) as FamilySubscription) : null;
  } catch {
    return null;
  }
}

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
    // A new purchase in development behaves like one bought after 1.3.0.
    if (!(await kvGet(PURCHASE_KEYS.fullDate))) await kvSet(PURCHASE_KEYS.fullDate, String(Date.now()));
    return true;
  },

  async restore() {
    await delay(400);
    return (await kvGet(PURCHASE_KEYS.purchased)) === '1' || !!(await readFamily());
  },

  async getFamilyOffer() {
    return {
      plans: FAMILY_PLANS.map((p) => ({
        id: p.id,
        period: p.period,
        priceLabel: p.fallbackPriceLabel,
        price: p.fallbackPrice,
        available: true,
      })),
      trialEligible: !(await readFamily()),
    };
  },

  async getFamilyState() {
    const date = await kvGet(PURCHASE_KEYS.fullDate);
    return { subscription: await readFamily(), fullDate: date ? Number(date) : null };
  },

  async refreshFamily() {},

  async purchaseFamily(productId) {
    await delay(600);
    const trial = !(await readFamily());
    const sub: FamilySubscription = {
      productId,
      expiresAt: Date.now() + (trial ? 7 : productId === 'family_monthly' ? 30 : 365) * DAY,
      trial,
      willRenew: true,
    };
    await kvSet(PURCHASE_KEYS.family, JSON.stringify(sub));
    return true;
  },

  async manageSubscriptions() {
    Alert.alert('Mock', 'Opens App Store subscriptions in a real build.');
  },
};
