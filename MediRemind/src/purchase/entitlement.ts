/**
 * Pure entitlement computation: maps (purchased?, firstLaunchAt) onto the
 * trial-then-lock model chosen for launch.
 *
 *   purchased            → 'pro'
 *   within trial window  → 'trial' (with days remaining)
 *   trial expired        → 'locked'
 */
import type { EntitlementStatus } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface Entitlement {
  status: EntitlementStatus;
  /** Whole days left in the trial (0 when pro or locked). */
  trialDaysLeft: number;
}

export function computeEntitlement(
  purchased: boolean,
  firstLaunchAt: number,
  now: number,
  trialDays: number
): Entitlement {
  if (purchased) {
    return { status: 'pro', trialDaysLeft: 0 };
  }
  const trialEnd = firstLaunchAt + trialDays * MS_PER_DAY;
  if (now < trialEnd) {
    const trialDaysLeft = Math.max(1, Math.ceil((trialEnd - now) / MS_PER_DAY));
    return { status: 'trial', trialDaysLeft };
  }
  return { status: 'locked', trialDaysLeft: 0 };
}
