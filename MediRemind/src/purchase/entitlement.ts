/**
 * Maps purchase state onto access:
 *   purchased              → 'pro'
 *   trial never started    → 'new'    (trial intro is shown)
 *   within the trial       → 'trial'  (with days remaining)
 *   trial over             → 'locked'
 */
import type { EntitlementStatus } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface Entitlement {
  status: EntitlementStatus;
  /** Whole days left in the trial (0 unless status is 'trial'). */
  trialDaysLeft: number;
}

export function computeEntitlement(
  purchased: boolean,
  trialStartedAt: number | null,
  now: number,
  trialDays: number
): Entitlement {
  if (purchased) return { status: 'pro', trialDaysLeft: 0 };
  if (trialStartedAt == null) return { status: 'new', trialDaysLeft: 0 };
  const trialEnd = trialStartedAt + trialDays * MS_PER_DAY;
  if (now < trialEnd) {
    return { status: 'trial', trialDaysLeft: Math.max(1, Math.ceil((trialEnd - now) / MS_PER_DAY)) };
  }
  return { status: 'locked', trialDaysLeft: 0 };
}
