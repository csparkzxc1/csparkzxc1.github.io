/**
 * App-wide entitlement context: loads purchase/trial state on mount and exposes
 * the status plus purchase, restore, and start-trial actions. App.tsx gates the
 * UI on it (trial intro → app → lock screen).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { activeProvider } from './provider';
import { computeEntitlement } from './entitlement';
import { PURCHASE_CONFIG } from './purchase.config';
import type { EntitlementStatus, PurchaseProduct } from './types';

interface EntitlementContextValue {
  loading: boolean;
  status: EntitlementStatus;
  trialDaysLeft: number;
  product: PurchaseProduct | null;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  startTrial: () => Promise<boolean>;
  reload: () => Promise<void>;
}

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<EntitlementStatus>('new');
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [product, setProduct] = useState<PurchaseProduct | null>(null);

  const reload = useCallback(async () => {
    const [purchased, trialStartedAt] = await Promise.all([
      activeProvider.isPurchased(),
      activeProvider.getTrialStartedAt(),
    ]);
    const ent = computeEntitlement(purchased, trialStartedAt, Date.now(), PURCHASE_CONFIG.trialDays);
    setStatus(ent.status);
    setTrialDaysLeft(ent.trialDaysLeft);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await activeProvider.init();
        await reload();
      } catch (e) {
        console.error('[entitlement] init failed', e);
      } finally {
        if (active) setLoading(false);
      }
      // The price isn't needed for the first screen; don't block startup on it.
      activeProvider
        .getProduct()
        .then((p) => active && setProduct(p))
        .catch(() => {});
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  // The trial can end while the app sits in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') reload().catch(() => {});
    });
    return () => sub.remove();
  }, [reload]);

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

  const startTrial = useCallback(async () => {
    const ok = await activeProvider.startTrial();
    if (ok) await reload();
    return ok;
  }, [reload]);

  const value = useMemo(
    () => ({ loading, status, trialDaysLeft, product, purchase, restore, startTrial, reload }),
    [loading, status, trialDaysLeft, product, purchase, restore, startTrial, reload]
  );

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement(): EntitlementContextValue {
  const ctx = useContext(EntitlementContext);
  if (!ctx) throw new Error('useEntitlement must be used within EntitlementProvider');
  return ctx;
}
