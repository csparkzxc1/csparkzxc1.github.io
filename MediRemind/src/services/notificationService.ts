import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medicine } from '../types';
import { isMedicineScheduledForWeekday } from '../utils/dateUtils';
import { getDaysUntilPrescriptionEnd } from '../utils/prescriptionUtils';
import { getNotificationSettings } from './databaseService';

// ─── Setup ──────────────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[Notification] requestPermission error:', error);
    return false;
  }
}

// ─── Channel Setup (Android) ────────────────────────────────────────────────

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('dose-reminder', {
      name: '약 복용 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A6CF7',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('prescription-reminder', {
      name: '재처방 알림',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }
}

// ─── Schedule Medicine Dose Notifications ───────────────────────────────────

export async function scheduleNotificationsForMedicine(medicine: Medicine): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const settings = await getNotificationSettings();

  // Schedule daily/weekly dose notifications for next 30 days
  const now = new Date();
  const identifiers: string[] = [];

  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + dayOffset);
    const weekday = targetDate.getDay(); // 0=Sun...6=Sat

    if (!isMedicineScheduledForWeekday(medicine, weekday)) continue;

    for (const timeStr of medicine.times) {
      const [hours, minutes] = timeStr.split(':').map(Number);

      const trigger = new Date(targetDate);
      trigger.setHours(hours, minutes, 0, 0);

      // Apply notification offset (notify N minutes before dose time)
      const offset = medicine.notificationOffset ?? 0;
      if (offset > 0) {
        trigger.setTime(trigger.getTime() - offset * 60 * 1000);
      }

      // Skip if already past
      if (trigger <= now) continue;

      const offsetLabel = offset > 0 ? ` (${offset}분 전 알림)` : '';
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: '💊 약 복용 알림',
            body: `${medicine.name} 복용할 시간이에요 (${medicine.dosage})${offsetLabel}`,
            sound: settings.sound ? 'default' : undefined,
            vibrate: settings.vibration ? [0, 250, 250, 250] : undefined,
            data: {
              type: 'dose',
              medicineId: medicine.id,
              time: timeStr,
            },
          },
          trigger: { date: trigger },
        });
        identifiers.push(id);
      } catch (error) {
        console.error('[Notification] schedule dose error:', error);
      }
    }
  }

  // Store notification IDs for this medicine so we can cancel them later
  await storeMedicineNotificationIds(medicine.id, identifiers);

  // Schedule prescription alerts
  if (medicine.prescription) {
    await schedulePrescriptionAlerts(medicine);
  }
}

export async function cancelNotificationsForMedicine(medicineId: string): Promise<void> {
  try {
    const ids = await getMedicineNotificationIds(medicineId);
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    await clearMedicineNotificationIds(medicineId);
  } catch (error) {
    console.error('[Notification] cancelNotifications error:', error);
  }
}

// ─── Prescription Alerts ────────────────────────────────────────────────────

async function schedulePrescriptionAlerts(medicine: Medicine): Promise<void> {
  if (!medicine.prescription) return;
  const settings = await getNotificationSettings();
  const daysLeft = getDaysUntilPrescriptionEnd(medicine.prescription);
  const identifiers: string[] = [];

  for (const alertDay of medicine.prescription.alertDays) {
    if (daysLeft > alertDay) {
      const alertDate = new Date();
      alertDate.setDate(alertDate.getDate() + (daysLeft - alertDay));
      alertDate.setHours(9, 0, 0, 0);

      if (alertDate > new Date()) {
        try {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: '🏥 재처방 알림',
              body: `${medicine.name} 재처방이 D-${alertDay}일 남았어요. 병원 예약을 확인하세요.`,
              sound: settings.sound ? 'default' : undefined,
              data: {
                type: 'prescription',
                medicineId: medicine.id,
                alertDay,
              },
            },
            trigger: { date: alertDate },
          });
          identifiers.push(id);
        } catch (error) {
          console.error('[Notification] schedule prescription error:', error);
        }
      }
    }
  }

  const existing = await getMedicineNotificationIds(medicine.id);
  await storeMedicineNotificationIds(medicine.id, [...existing, ...identifiers]);
}

// ─── Storage Helpers for Notification IDs ───────────────────────────────────

const NOTIF_IDS_PREFIX = '@mediremind_notif_ids_';

async function storeMedicineNotificationIds(
  medicineId: string,
  ids: string[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${NOTIF_IDS_PREFIX}${medicineId}`,
      JSON.stringify(ids)
    );
  } catch (error) {
    console.error('[Notification] storeMedicineNotificationIds error:', error);
  }
}

async function getMedicineNotificationIds(medicineId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(`${NOTIF_IDS_PREFIX}${medicineId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function clearMedicineNotificationIds(medicineId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${NOTIF_IDS_PREFIX}${medicineId}`);
  } catch {
    // ignore
  }
}

// ─── Cancel All Notifications ───────────────────────────────────────────────

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[Notification] cancelAllNotifications error:', error);
  }
}
