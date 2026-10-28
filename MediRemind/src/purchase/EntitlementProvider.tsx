/**
 * App-wide entitlement context: whether the full version is owned, plus the
 * purchase and restore actions.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { activeProvider } from './provider';
import type { EntitlementStatus, PurchaseProduct } from './types';

interface EntitlementContextValue {
  loading: boolean;
  status: EntitlementStatus;
  isPro: boolean;
  product: PurchaseProduct | null;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  reload: () => Promise<void>;
}

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<EntitlementStatus>('free');
  const [product, setProduct] = useState<PurchaseProduct | null>(null);

  const reload = useCallback(async () => {
    setStatus((await activeProvider.isPurchased()) ? 'pro' : 'free');
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

  const purchase = useCallback(async () => {
    const ok = await activeProvider.purchase();
    if (ok) await reload();
    return ok;
  }, [reload]);

  const restore = useCallback(async () => {
    const ok = await activeProvider.restore();
    await reload();
    return ok;
  }, [reload]);

  const value = useMemo(
    () => ({ loading, status, isPro: status === 'pro', product, purchase, restore, reload }),
    [loading, status, product, purchase, restore, reload]
  );

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement(): EntitlementContextValue {
  const ctx = useContext(EntitlementContext);
  if (!ctx) throw new Error('useEntitlement must be used within EntitlementProvider');
  return ctx;
}
