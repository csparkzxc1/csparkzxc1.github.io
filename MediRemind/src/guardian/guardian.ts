/**
 * Guardian link: a patient shares their dose schedule with family members,
 * who get a push when a dose is still untaken 30 minutes after it was due.
 *
 * Accounts are Supabase anonymous users created the first time someone uses
 * the feature; nothing leaves the device before that. Only a patient who has
 * created an invite uploads their slots (see `sharing`).
 */
import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Medicine } from '../types';
import { kvDelete, kvGet, kvSet } from '../db/kv';
import { getDoseRecordsByDate } from '../db/doseRepository';
import { getActiveLanguage } from '../i18n/core';
import { dateKey, parseDateKey } from '../lib/schedule';
import { ensurePermission } from '../notifications/notifications';
import { GUARDIAN_CONFIG, guardianAvailable } from './config';
import { buildSlots, type DoseSlot } from './slots';

const KEYS = {
  /** Set once an account exists, so the client isn't even created before. */
  active: 'guardian.active',
  /** Set while this user shares their doses (has created an invite). */
  sharing: 'guardian.sharing',
  authPrefix: 'guardian.auth.',
} as const;

export interface Person {
  id: string;
  name: string;
}

export interface Links {
  me: string;
  /** People who watch my doses. */
  guardians: Person[];
  /** People whose doses I watch. */
  patients: Person[];
}

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  client = createClient(GUARDIAN_CONFIG.url, GUARDIAN_CONFIG.anonKey, {
    auth: {
      storage: {
        getItem: (k) => kvGet(KEYS.authPrefix + k),
        setItem: (k, v) => kvSet(KEYS.authPrefix + k, v),
        removeItem: (k) => kvDelete(KEYS.authPrefix + k),
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  // Token refresh only while the app is in the foreground.
  AppState.addEventListener('change', (s) => {
    if (s === 'active') client?.auth.startAutoRefresh();
    else client?.auth.stopAutoRefresh();
  });
  return client;
}

export async function isActive(): Promise<boolean> {
  return guardianAvailable() && (await kvGet(KEYS.active)) === '1';
}

async function ensureSession(): Promise<string> {
  const sb = getClient();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signedIn, error } = await sb.auth.signInAnonymously();
  if (error || !signedIn.user) throw error ?? new Error('sign-in failed');
  await kvSet(KEYS.active, '1');
  return signedIn.user.id;
}

function timezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';
  } catch {
    return 'Asia/Seoul';
  }
}

async function upsertProfile(fields: { display_name?: string; push_token?: string } = {}) {
  const me = await ensureSession();
  const { error } = await getClient()
    .from('profiles')
    .upsert({
      user_id: me,
      language: getActiveLanguage(),
      timezone: timezone(),
      updated_at: new Date().toISOString(),
      ...fields,
    });
  if (error) throw error;
}

export async function getDisplayName(): Promise<string> {
  if (!(await isActive())) return '';
  const me = await ensureSession();
  const { data } = await getClient().from('profiles').select('display_name').eq('user_id', me).maybeSingle();
  return data?.display_name ?? '';
}

export async function setDisplayName(name: string): Promise<void> {
  await upsertProfile({ display_name: name.trim() });
}

/** Registers this device for missed-dose pushes. False if notifications are off. */
async function registerPush(): Promise<boolean> {
  if (!(await ensurePermission())) return false;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await upsertProfile({ push_token: token });
  return true;
}

// ── Patient side ────────────────────────────────────────────────────────────

/** A 6-digit code (valid 30 minutes) a family member enters to link up. */
export async function createInvite(medicines: Medicine[]): Promise<string> {
  await upsertProfile();
  await kvSet(KEYS.sharing, '1');
  await syncSlots(medicines);
  const { data, error } = await getClient().rpc('create_invite');
  if (error) throw error;
  return data as string;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncChain: Promise<void> = Promise.resolve();

/** Uploads today's and the coming days' doses. No-op unless sharing. */
export function syncSlots(medicines: Medicine[]): Promise<void> {
  syncChain = syncChain
    .catch(() => {})
    .then(async () => {
      if (!(await isActive()) || (await kvGet(KEYS.sharing)) !== '1') return;
      const today = dateKey(new Date());
      const slots: DoseSlot[] = buildSlots(medicines, await getDoseRecordsByDate(today), today);
      await ensureSession();
      const { error } = await getClient().rpc('sync_slots', {
        p_from: parseDateKey(today).toISOString(),
        p_slots: slots,
      });
      if (error) throw error;
    });
  return syncChain;
}

/** Coalesces bursts of changes (e.g. marking several doses) into one upload. */
export function scheduleSlotSync(getMedicines: () => Medicine[], delayMs = 2000): void {
  if (!guardianAvailable()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncSlots(getMedicines()).catch((e) => console.warn('[guardian] sync failed', e));
  }, delayMs);
}

// ── Guardian side ───────────────────────────────────────────────────────────

export type RedeemResult = 'linked' | 'linked_no_push' | 'invalid_code' | 'own_code';

export async function redeemInvite(code: string): Promise<RedeemResult> {
  await upsertProfile();
  const { error } = await getClient().rpc('redeem_invite', { p_code: code.replace(/\D/g, '') });
  if (error) {
    if (/own_code/.test(error.message)) return 'own_code';
    if (/invalid_code/.test(error.message)) return 'invalid_code';
    throw error;
  }
  let push = false;
  try {
    push = await registerPush();
  } catch (e) {
    console.warn('[guardian] push registration failed', e);
  }
  return push ? 'linked' : 'linked_no_push';
}

/** Today's doses of a linked patient, in their order. */
export async function patientToday(patientId: string): Promise<DoseSlot[]> {
  const start = parseDateKey(dateKey(new Date()));
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const { data, error } = await getClient()
    .from('dose_slots')
    .select('id, medicine_name, due_at, taken_at')
    .eq('patient_id', patientId)
    .gte('due_at', start.toISOString())
    .lt('due_at', end.toISOString())
    .order('due_at');
  if (error) throw error;
  return (data ?? []) as DoseSlot[];
}

// ── Both sides ──────────────────────────────────────────────────────────────

export async function getLinks(): Promise<Links | null> {
  if (!(await isActive())) return null;
  const me = await ensureSession();
  const sb = getClient();
  const { data: links, error } = await sb.from('guardian_links').select('patient_id, guardian_id');
  if (error) throw error;
  const ids = [...new Set((links ?? []).flatMap((l) => [l.patient_id, l.guardian_id]))].filter(
    (id) => id !== me
  );
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profiles } = await sb.from('profiles').select('user_id, display_name').in('user_id', ids);
    for (const p of profiles ?? []) names.set(p.user_id, p.display_name);
  }
  const person = (id: string): Person => ({ id, name: names.get(id) ?? '' });
  // Keep a guardian's push token fresh (tokens can change after reinstall).
  if ((links ?? []).some((l) => l.guardian_id === me)) {
    registerPush().catch(() => {});
  }
  return {
    me,
    guardians: (links ?? []).filter((l) => l.patient_id === me).map((l) => person(l.guardian_id)),
    patients: (links ?? []).filter((l) => l.guardian_id === me).map((l) => person(l.patient_id)),
  };
}

export async function unlink(patientId: string, guardianId: string): Promise<void> {
  const { error } = await getClient()
    .from('guardian_links')
    .delete()
    .eq('patient_id', patientId)
    .eq('guardian_id', guardianId);
  if (error) throw error;
}

/** Deletes the account, links and shared doses on the server. */
export async function deleteAllData(): Promise<void> {
  if (await isActive()) {
    const sb = getClient();
    const { error } = await sb.rpc('delete_my_data');
    if (error) throw error;
    await sb.auth.signOut({ scope: 'local' }).catch(() => {});
  }
  await kvDelete(KEYS.active);
  await kvDelete(KEYS.sharing);
}
