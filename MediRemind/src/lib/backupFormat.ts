/**
 * Backup file format and validation, kept free of native modules so it can be
 * unit-tested in Node.
 */
import type { DoseRecord, Medicine } from '../types';
import { t } from '../i18n/core';

export const BACKUP_APP_TAG = 'mediremind';
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupBundle {
  app: typeof BACKUP_APP_TAG;
  schemaVersion: number;
  exportedAt: string;
  medicines: Medicine[];
  doseRecords: DoseRecord[];
}

export function parseBundle(raw: unknown): BackupBundle {
  if (!raw || typeof raw !== 'object') throw new Error(t('backup.invalid'));
  const obj = raw as Record<string, unknown>;
  if (obj.app !== BACKUP_APP_TAG || !Array.isArray(obj.medicines)) {
    throw new Error(t('backup.invalid'));
  }
  const version = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 1;
  if (version > BACKUP_SCHEMA_VERSION) throw new Error(t('backup.newer'));

  const medicines = (obj.medicines as unknown[]).filter(isMedicine);
  const doseRecords = Array.isArray(obj.doseRecords)
    ? (obj.doseRecords as unknown[]).filter(isDoseRecord)
    : [];
  return {
    app: BACKUP_APP_TAG,
    schemaVersion: version,
    exportedAt: String(obj.exportedAt ?? ''),
    medicines: medicines.map((m) => ({ ...m, notificationOffset: m.notificationOffset ?? 0 })),
    doseRecords,
  };
}

function isMedicine(v: unknown): v is Medicine {
  const m = v as Partial<Medicine> | null;
  return (
    !!m &&
    typeof m.id === 'string' &&
    typeof m.name === 'string' &&
    typeof m.dosage === 'string' &&
    Array.isArray(m.times) &&
    m.days !== undefined
  );
}

function isDoseRecord(v: unknown): v is DoseRecord {
  const r = v as Partial<DoseRecord> | null;
  return (
    !!r &&
    typeof r.id === 'string' &&
    typeof r.medicineId === 'string' &&
    typeof r.date === 'string' &&
    typeof r.scheduledTime === 'string'
  );
}
