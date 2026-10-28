/**
 * On-device reminders. Every change to the medicine list re-syncs the whole
 * schedule from scratch: scheduled notifications are looked up from the OS
 * (no ID bookkeeping to drift), cancelled, and rebuilt from the plan.
 */
import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Medicine } from '../types';
import { kvGet, kvSet, KV_KEYS } from '../db/kv';
import { t } from '../i18n/core';
import {
  buildNotificationPlan,
  SCHEDULE_BUDGET,
  type PlannedNotification,
} from '../lib/notificationPlan';
import { addDays, dateKey } from '../lib/schedule';
import { notificationDateMs } from '../lib/time';
import { daysUntilPrescriptionEnd } from '../lib/prescription';

const DOSE_CHANNEL = 'dose-reminder';
const REFILL_CHANNEL = 'prescription-reminder';
const DOSE_CATEGORY = 'dose';
export const TAKE_ACTION = 'TAKE';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Settings ────────────────────────────────────────────────────────────────

export interface ReminderSettings {
  sound: boolean;
  vibration: boolean;
}

export async function loadReminderSettings(): Promise<ReminderSettings> {
  const [sound, vibration] = await Promise.all([
    kvGet(KV_KEYS.notifSound),
    kvGet(KV_KEYS.notifVibration),
  ]);
  return { sound: sound !== '0', vibration: vibration !== '0' };
}

export async function saveReminderSettings(s: ReminderSettings): Promise<void> {
  await kvSet(KV_KEYS.notifSound, s.sound ? '1' : '0');
  await kvSet(KV_KEYS.notifVibration, s.vibration ? '1' : '0');
}

// ── Permission & setup ──────────────────────────────────────────────────────

export async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch (e) {
    console.warn('[notif] permission check failed', e);
    return false;
  }
}

export function openSystemSettings(): void {
  Linking.openSettings().catch(() => {});
}

/** Channels (Android) and the "Mark taken" action; re-run on language change. */
export async function setupNotificationCategories(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(DOSE_CHANNEL, {
      name: t('notif.channelDose'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A6CF7',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync(REFILL_CHANNEL, {
      name: t('notif.channelRefill'),
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }
  await Notifications.setNotificationCategoryAsync(DOSE_CATEGORY, [
    {
      identifier: TAKE_ACTION,
      buttonTitle: t('notif.actionTake'),
      // Opening the app guarantees the JS handler runs and the dose is saved,
      // even when the app had been fully closed.
      options: { opensAppToForeground: true },
    },
  ]);
}

// ── Scheduling ──────────────────────────────────────────────────────────────

let syncChain: Promise<void> = Promise.resolve();

/** Rebuilds every reminder from the medicine list. Calls are serialized. */
export function syncNotifications(medicines: Medicine[]): Promise<void> {
  syncChain = syncChain
    .catch(() => {})
    .then(() => doSync(medicines))
    .catch((e) => console.warn('[notif] sync failed', e));
  return syncChain;
}

async function doSync(medicines: Medicine[]): Promise<void> {
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const type = (n.content.data as { type?: string } | undefined)?.type;
    // 'prescription' is how version 1.0.0 tagged its refill alerts.
    if (type === 'dose' || type === 'refill' || type === 'prescription') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  const settings = await loadReminderSettings();
  const plan = buildNotificationPlan(medicines);
  if (plan.length > SCHEDULE_BUDGET) {
    console.warn(`[notif] plan has ${plan.length} slots; only ${SCHEDULE_BUDGET} fit on iOS`);
  }

  let budget = SCHEDULE_BUDGET;
  for (const slot of plan) {
    if (budget <= 0) break;
    await scheduleDoseSlot(slot, settings);
    budget -= 1;
  }

  for (const med of medicines) {
    if (!med.isActive || !med.prescription) continue;
    budget = await scheduleRefillAlerts(med, settings, budget);
  }
}

async function scheduleDoseSlot(slot: PlannedNotification, s: ReminderSettings) {
  const first = slot.doses[0];
  const names = slot.doses.map((d) => d.name);
  const allEarly = slot.doses.every((d) => d.offset === first.offset && d.offset > 0);
  const body = allEarly
    ? t('notif.doseBodyEarly', { n: first.offset, list: names.join(', ') })
    : slot.doses.length === 1
      ? t('notif.doseBodyOne', { name: first.name, dosage: first.dosage })
      : names.join(', ');

  const trigger: Notifications.NotificationTriggerInput =
    slot.weekday === null
      ? {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: slot.hour,
          minute: slot.minute,
          channelId: DOSE_CHANNEL,
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: slot.weekday,
          hour: slot.hour,
          minute: slot.minute,
          channelId: DOSE_CHANNEL,
        };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('notif.doseTitle'),
      body,
      sound: s.sound ? 'default' : false,
      vibrate: s.vibration ? [0, 250, 250, 250] : undefined,
      categoryIdentifier: DOSE_CATEGORY,
      data: {
        type: 'dose',
        doses: slot.doses.map((d) => ({
          medicineId: d.medicineId,
          doseTime: d.doseTime,
          dayShift: d.dayShift,
        })),
      },
    },
    trigger,
  });
}

async function scheduleRefillAlerts(
  med: Medicine,
  s: ReminderSettings,
  budget: number
): Promise<number> {
  const p = med.prescription!;
  const daysLeft = daysUntilPrescriptionEnd(p);
  const today = dateKey(new Date());
  for (const alertDay of [...p.alertDays].sort((a, b) => b - a)) {
    if (budget <= 0) break;
    if (daysLeft <= alertDay) continue;
    const [y, m, d] = addDays(today, daysLeft - alertDay).split('-').map(Number);
    const at = new Date(y, m - 1, d, 9, 0, 0, 0);
    if (at.getTime() <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notif.refillTitle'),
        body: t('notif.refillBody', { name: med.name, n: alertDay }),
        sound: s.sound ? 'default' : false,
        data: { type: 'refill', medicineId: med.id, alertDay },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        channelId: REFILL_CHANNEL,
      },
    });
    budget -= 1;
  }
  return budget;
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── "Mark taken" action ─────────────────────────────────────────────────────

export interface DoseToMark {
  medicineId: string;
  date: string;
  time: string;
}

export interface TakeResponse {
  /** Identifies this delivery, for markResponseHandled. */
  key: string;
  doses: DoseToMark[];
}

/**
 * The doses a "Mark taken" response refers to, or null for any other response
 * or one already handled (a cold start can deliver the same response twice).
 * Call markResponseHandled once the doses are saved.
 */
export async function readTakeResponse(
  response: Notifications.NotificationResponse
): Promise<TakeResponse | null> {
  if (response.actionIdentifier !== TAKE_ACTION) return null;
  const data = response.notification.request.content.data as
    | { type?: string; doses?: { medicineId: string; doseTime: string; dayShift: number }[] }
    | undefined;
  if (data?.type !== 'dose' || !Array.isArray(data.doses)) return null;

  const deliveredAt = new Date(notificationDateMs(response.notification.date));
  const key = `${response.notification.request.identifier}@${deliveredAt.getTime()}`;
  const handled: string[] = JSON.parse((await kvGet(KV_KEYS.handledResponses)) ?? '[]');
  if (handled.includes(key)) return null;

  const deliveredKey = dateKey(deliveredAt);
  return {
    key,
    doses: data.doses.map((d) => ({
      medicineId: d.medicineId,
      date: addDays(deliveredKey, d.dayShift ?? 0),
      time: d.doseTime,
    })),
  };
}

export async function markResponseHandled(key: string): Promise<void> {
  const handled: string[] = JSON.parse((await kvGet(KV_KEYS.handledResponses)) ?? '[]');
  if (!handled.includes(key)) {
    await kvSet(KV_KEYS.handledResponses, JSON.stringify([...handled, key].slice(-50)));
  }
}
