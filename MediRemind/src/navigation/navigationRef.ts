/**
 * Lets code outside screens navigate, e.g. a notification tap. A request made
 * before the navigator is mounted (the tap that cold-started the app) waits
 * until it is ready.
 */
import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pending: (() => void) | null = null;

export function openGuardian(): void {
  const go = () => navigationRef.navigate('Guardian');
  if (navigationRef.isReady()) go();
  else pending = go;
}

/** Called by NavigationContainer's onReady. */
export function flushPendingNavigation(): void {
  const go = pending;
  pending = null;
  go?.();
}
