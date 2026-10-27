/**
 * Small key/value store backed by the `kv` table, for app-level state that
 * isn't a medicine or dose (settings, theme, language, purchase, trial start).
 */
import { getDb } from './database';

export async function kvGet(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [
    key,
  ]);
  return row?.value ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO kv (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export async function kvDelete(key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM kv WHERE key = ?', [key]);
}

export const KV_KEYS = {
  notifSound: 'notif.sound',
  notifVibration: 'notif.vibration',
  themeMode: 'theme.mode',
  language: 'app.language',
  lastGeneratedDate: 'dose.lastGeneratedDate',
  handledResponses: 'notif.handledResponses',
} as const;
