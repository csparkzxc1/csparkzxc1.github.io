/**
 * Backup and restore through a JSON file the user keeps (iCloud Drive, Files).
 * Restoring upserts by id, so importing the same backup twice doesn't create
 * duplicates and a new phone ends up with exactly the backed-up data.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { transaction } from '../db/database';
import { getAllMedicines, serializeMedicine, UPSERT_MEDICINE_SQL } from '../db/medicineRepository';
import { getAllDoseRecords } from '../db/doseRepository';
import { t } from '../i18n/core';
import { pad } from './time';
import { BACKUP_APP_TAG, BACKUP_SCHEMA_VERSION, parseBundle, type BackupBundle } from './backupFormat';

export async function buildBundle(): Promise<BackupBundle> {
  return {
    app: BACKUP_APP_TAG,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    medicines: await getAllMedicines(),
    doseRecords: await getAllDoseRecords(),
  };
}

export async function exportBackup(): Promise<void> {
  const bundle = await buildBundle();
  const d = new Date();
  const name = `mediremind-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(bundle, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: t('backup.dialog'),
      UTI: 'public.json',
    });
  }
}

export interface ImportResult {
  cancelled: boolean;
  medicines: number;
  doseRecords: number;
}

export async function importBackup(): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'public.json', '*/*'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) {
    return { cancelled: true, medicines: 0, doseRecords: 0 };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await new File(picked.assets[0].uri).text());
  } catch {
    throw new Error(t('backup.readError'));
  }
  const bundle = parseBundle(parsed);

  await transaction(async (db) => {
    for (const m of bundle.medicines) {
      await db.runAsync(UPSERT_MEDICINE_SQL, serializeMedicine(m));
    }
    const ids = new Set(bundle.medicines.map((m) => m.id));
    for (const r of bundle.doseRecords) {
      if (!ids.has(r.medicineId)) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO dose_records (id, medicineId, scheduledTime, takenAt, date, isTaken)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [r.id, r.medicineId, r.scheduledTime, r.takenAt ?? null, r.date, r.isTaken ? 1 : 0]
      );
    }
  });

  return { cancelled: false, medicines: bundle.medicines.length, doseRecords: bundle.doseRecords.length };
}
