import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medicine, DoseRecord, NotificationSettings } from '../types';

// ─── Database Setup ─────────────────────────────────────────────────────────

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync('mediremind.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS medicines (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        times TEXT NOT NULL,
        days TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#4A90D9',
        memo TEXT NOT NULL DEFAULT '',
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        prescription TEXT,
        notificationOffset INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS dose_records (
        id TEXT PRIMARY KEY NOT NULL,
        medicineId TEXT NOT NULL,
        scheduledTime TEXT NOT NULL,
        takenAt TEXT,
        date TEXT NOT NULL,
        isTaken INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (medicineId) REFERENCES medicines(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_dose_records_date ON dose_records(date);
      CREATE INDEX IF NOT EXISTS idx_dose_records_medicineId ON dose_records(medicineId);
    `);
    // Migration: add notificationOffset for existing installations
    try {
      await db.execAsync(
        `ALTER TABLE medicines ADD COLUMN notificationOffset INTEGER NOT NULL DEFAULT 0;`
      );
    } catch {
      // Column already exists — safe to ignore
    }
  } catch (error) {
    console.error('[DB] initDatabase error:', error);
    throw error;
  }
}

function getDb(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

// ─── Medicine CRUD ──────────────────────────────────────────────────────────

export async function getAllMedicines(): Promise<Medicine[]> {
  try {
    const database = getDb();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM medicines ORDER BY createdAt DESC'
    );
    return rows.map(deserializeMedicine);
  } catch (error) {
    console.error('[DB] getAllMedicines error:', error);
    return [];
  }
}

export async function insertMedicine(medicine: Medicine): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync(
      `INSERT INTO medicines (id, name, dosage, times, days, color, memo, isActive, createdAt, prescription, notificationOffset)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        medicine.id,
        medicine.name,
        medicine.dosage,
        JSON.stringify(medicine.times),
        JSON.stringify(medicine.days),
        medicine.color,
        medicine.memo,
        medicine.isActive ? 1 : 0,
        medicine.createdAt,
        medicine.prescription ? JSON.stringify(medicine.prescription) : null,
        medicine.notificationOffset ?? 0,
      ]
    );
  } catch (error) {
    console.error('[DB] insertMedicine error:', error);
    throw error;
  }
}

export async function updateMedicine(medicine: Medicine): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync(
      `UPDATE medicines
       SET name=?, dosage=?, times=?, days=?, color=?, memo=?, isActive=?, prescription=?, notificationOffset=?
       WHERE id=?`,
      [
        medicine.name,
        medicine.dosage,
        JSON.stringify(medicine.times),
        JSON.stringify(medicine.days),
        medicine.color,
        medicine.memo,
        medicine.isActive ? 1 : 0,
        medicine.prescription ? JSON.stringify(medicine.prescription) : null,
        medicine.notificationOffset ?? 0,
        medicine.id,
      ]
    );
  } catch (error) {
    console.error('[DB] updateMedicine error:', error);
    throw error;
  }
}

export async function deleteMedicine(id: string): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync('DELETE FROM medicines WHERE id=?', [id]);
    await database.runAsync('DELETE FROM dose_records WHERE medicineId=?', [id]);
  } catch (error) {
    console.error('[DB] deleteMedicine error:', error);
    throw error;
  }
}

// ─── DoseRecord CRUD ────────────────────────────────────────────────────────

export async function getDoseRecordsByDate(date: string): Promise<DoseRecord[]> {
  try {
    const database = getDb();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM dose_records WHERE date=? ORDER BY scheduledTime ASC',
      [date]
    );
    return rows.map(deserializeDoseRecord);
  } catch (error) {
    console.error('[DB] getDoseRecordsByDate error:', error);
    return [];
  }
}

export async function getDoseRecordsByDateRange(
  startDate: string,
  endDate: string
): Promise<DoseRecord[]> {
  try {
    const database = getDb();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM dose_records WHERE date >= ? AND date <= ? ORDER BY date ASC, scheduledTime ASC',
      [startDate, endDate]
    );
    return rows.map(deserializeDoseRecord);
  } catch (error) {
    console.error('[DB] getDoseRecordsByDateRange error:', error);
    return [];
  }
}

export async function insertDoseRecord(record: DoseRecord): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync(
      `INSERT OR IGNORE INTO dose_records (id, medicineId, scheduledTime, takenAt, date, isTaken)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.medicineId,
        record.scheduledTime,
        record.takenAt,
        record.date,
        record.isTaken ? 1 : 0,
      ]
    );
  } catch (error) {
    console.error('[DB] insertDoseRecord error:', error);
    throw error;
  }
}

export async function updateDoseRecord(record: DoseRecord): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync(
      'UPDATE dose_records SET takenAt=?, isTaken=? WHERE id=?',
      [record.takenAt, record.isTaken ? 1 : 0, record.id]
    );
  } catch (error) {
    console.error('[DB] updateDoseRecord error:', error);
    throw error;
  }
}

export async function deleteDoseRecordsByMedicineAndDate(
  medicineId: string,
  date: string
): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync(
      'DELETE FROM dose_records WHERE medicineId=? AND date=? AND isTaken=0',
      [medicineId, date]
    );
  } catch (error) {
    console.error('[DB] deleteDoseRecordsByMedicineAndDate error:', error);
  }
}

export async function clearAllDoseRecords(): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync('DELETE FROM dose_records');
  } catch (error) {
    console.error('[DB] clearAllDoseRecords error:', error);
    throw error;
  }
}

// ─── AsyncStorage helpers ───────────────────────────────────────────────────

const SETTINGS_KEY = '@mediremind_settings';

export async function getNotificationSettings(): Promise<{
  sound: boolean;
  vibration: boolean;
}> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback to defaults
  }
  return { sound: true, vibration: true };
}

export async function saveNotificationSettings(settings: {
  sound: boolean;
  vibration: boolean;
}): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[DB] saveNotificationSettings error:', error);
  }
}

const AD_REMOVED_KEY = '@mediremind_ad_removed';

export async function getAdRemoved(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(AD_REMOVED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setAdRemoved(removed: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(AD_REMOVED_KEY, removed ? 'true' : 'false');
  } catch (error) {
    console.error('[DB] setAdRemoved error:', error);
  }
}

// ─── Serialization Helpers ──────────────────────────────────────────────────

function deserializeMedicine(row: Record<string, unknown>): Medicine {
  let days: Medicine['days'];
  try {
    const parsed = JSON.parse(row.days as string);
    days = parsed;
  } catch {
    days = 'everyday';
  }

  let times: string[];
  try {
    times = JSON.parse(row.times as string);
  } catch {
    times = [];
  }

  let prescription = null;
  if (row.prescription) {
    try {
      prescription = JSON.parse(row.prescription as string);
    } catch {
      prescription = null;
    }
  }

  return {
    id: row.id as string,
    name: row.name as string,
    dosage: row.dosage as string,
    times,
    days,
    color: row.color as string,
    memo: row.memo as string,
    isActive: (row.isActive as number) === 1,
    createdAt: row.createdAt as string,
    prescription,
    notificationOffset: (row.notificationOffset as number) ?? 0,
  };
}

function deserializeDoseRecord(row: Record<string, unknown>): DoseRecord {
  return {
    id: row.id as string,
    medicineId: row.medicineId as string,
    scheduledTime: row.scheduledTime as string,
    takenAt: (row.takenAt as string | null) ?? null,
    date: row.date as string,
    isTaken: (row.isTaken as number) === 1,
  };
}
