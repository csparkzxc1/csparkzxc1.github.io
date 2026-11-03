/**
 * App-wide entitlement context: whether the full version is owned, whether
 * family alerts are unlocked (family plan, or an early full-version purchase),
 * plus the purchase and restore actions.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { activeProvider } from './provider';
import { familyAccess, type FamilyAccess } from './family';
import type { EntitlementStatus, FamilyOffer, FamilySubscription, PurchaseProduct } from './types';

interface EntitlementContextValue {
  loading: boolean;
  status: EntitlementStatus;
  isPro: boolean;
  product: PurchaseProduct | null;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  reload: () => Promise<void>;
  /** Re-reads the price, e.g. when the paywall opens after a failed load. */
  refreshProduct: () => Promise<void>;

  /** How (or whether) watching family is unlocked. */
  family: FamilyAccess;
  hasFamily: boolean;
  familyOffer: FamilyOffer | null;
  refreshFamilyOffer: () => Promise<void>;
  purchaseFamily: (productId: string) => Promise<boolean>;
  manageSubscriptions: () => Promise<void>;
}

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<EntitlementStatus>('free');
  const [product, setProduct] = useState<PurchaseProduct | null>(null);
  const [subscription, setSubscription] = useState<FamilySubscription | null>(null);
  const [fullDate, setFullDate] = useState<number | null>(null);
  const [familyOffer, setFamilyOffer] = useState<FamilyOffer | null>(null);
  // Re-evaluated when the app returns to the foreground, so an expiry is noticed.
  const [now, setNow] = useState(() => Date.now());

  const reload = useCallback(async () => {
    setStatus((await activeProvider.isPurchased()) ? 'pro' : 'free');
    const state = await activeProvider.getFamilyState();
    setSubscription(state.subscription);
    setFullDate(state.fullDate);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await activeProvider.init();
      } catch (e) {
        console.error('[entitlement] init failed', e);
      }
      // Read the saved purchase even if the store is unreachable or restricted.
      try {
        await reload();
      } catch (e) {
        console.error('[entitlement] reload failed', e);
      }
      if (active) setLoading(false);
      // The price is only needed on the paywall; don't block startup on it.
      activeProvider
        .getProduct()
        .then((p) => active && setProduct(p))
        .catch(() => {});
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  useEffect(() => activeProvider.subscribe?.(() => reload().catch(() => {})), [reload]);

  // Renewals and cancellations happen outside the app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      activeProvider
        .refreshFamily()
        .catch(() => {})
        .finally(() => reload().catch(() => {}));
    });
    return () => sub.remove();
  }, [reload]);

  const refreshProduct = useCallback(async () => {
    setProduct(await activeProvider.getProduct());
  }, []);

  const refreshFamilyOffer = useCallback(async () => {
    setFamilyOffer(await activeProvider.getFamilyOffer());
  }, []);

  const purchase = useCallback(async () => {
    const ok = await activeProvider.purchase();
    if (ok) await reload();
    return ok;
  }, [reload]);

  const purchaseFamily = useCallback(
    async (productId: string) => {
      const ok = await activeProvider.purchaseFamily(productId);
      if (ok) await reload();
      return ok;
    },
    [reload]
  );

  const restore = useCallback(async () => {
    const ok = await activeProvider.restore();
    await reload();
    return ok;
  }, [reload]);

  const manageSubscriptions = useCallback(() => activeProvider.manageSubscriptions(), []);

  const value = useMemo(() => {
    const isPro = status === 'pro';
    const family = familyAccess(isPro, fullDate, subscription, now);
    return {
      loading,
      status,
      isPro,
      product,
      purchase,
      restore,
      reload,
      refreshProduct,
      family,
      hasFamily: family.kind !== 'none',
      familyOffer,
      refreshFamilyOffer,
      purchaseFamily,
      manageSubscriptions,
    };
  }, [
    loading,
    status,
    product,
    purchase,
    restore,
    reload,
    refreshProduct,
    fullDate,
    subscription,
    now,
    familyOffer,
    refreshFamilyOffer,
    purchaseFamily,
    manageSubscriptions,
  ]);

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement(): EntitlementContextValue {
  const ctx = useContext(EntitlementContext);
  if (!ctx) throw new Error('useEntitlement must be used within EntitlementProvider');
  return ctx;
}
