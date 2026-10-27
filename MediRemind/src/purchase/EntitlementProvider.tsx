/**
 * App-wide entitlement context. Loads purchase state on mount and exposes the
 * current status plus purchase/restore actions. The root layout uses this to
 * gate the app once the trial expires.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { activeProvider } from './provider';
import { computeEntitlement } from './entitlement';
import { PURCHASE_CONFIG } from './purchase.config';
import type { EntitlementStatus, PurchaseProduct } from './types';

interface EntitlementContextValue {
  loading: boolean;
  status: EntitlementStatus;
  trialDaysLeft: number;
  product: PurchaseProduct | null;
  /** Runs the purchase flow; returns true on success. */
  purchase: () => Promise<boolean>;
  /** Restores a prior purchase; returns true if one was restored. */
  restore: () => Promise<boolean>;
  reload: () => Promise<void>;
}

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<EntitlementStatus>('trial');
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [product, setProduct] = useState<PurchaseProduct | null>(null);

  const reload = useCallback(async () => {
    const [purchased, firstLaunchAt, prod] = await Promise.all([
      activeProvider.isPurchased(),
      activeProvider.getFirstLaunchAt(),
      activeProvider.getProduct(),
    ]);
    const ent = computeEntitlement(
      purchased,
      firstLaunchAt,
      Date.now(),
      PURCHASE_CONFIG.trialDays
    );
    setStatus(ent.status);
    setTrialDaysLeft(ent.trialDaysLeft);
    setProduct(prod);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await activeProvider.init();
        await reload();
      } catch (e) {
        console.error('Entitlement init failed', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  const purchase = useCallback(async () => {
    const ok = await activeProvider.purchase();
    if (ok) await reload();
    return ok;
  }, [reload]);

  const restore = useCallback(async () => {
    const ok = await activeProvider.restore();
    if (ok) await reload();
    return ok;
  }, [reload]);

  const value = useMemo(
    () => ({
      loading,
      status,
      trialDaysLeft,
      product,
      purchase,
      restore,
      reload,
    }),
    [loading, status, trialDaysLeft, product, purchase, restore, reload]
  );

  return (
    <EntitlementContext.Provider value={value}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlement(): EntitlementContextValue {
  const ctx = useContext(EntitlementContext);
  if (!ctx) {
    throw new Error('useEntitlement must be used within EntitlementProvider');
  }
  return ctx;
}
