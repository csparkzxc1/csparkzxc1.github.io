import { getDb, transaction, write } from './database';
import type { DoseRecord } from '../types';

export async function getDoseRecordsByDate(date: string): Promise<DoseRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM dose_records WHERE date=? ORDER BY scheduledTime ASC',
    [date]
  );
  return rows.map(deserializeDoseRecord);
}

export async function getDoseRecordsByDateRange(
  startDate: string,
  endDate: string
): Promise<DoseRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM dose_records WHERE date >= ? AND date <= ? ORDER BY date ASC, scheduledTime ASC',
    [startDate, endDate]
  );
  return rows.map(deserializeDoseRecord);
}

export async function getAllDoseRecords(): Promise<DoseRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM dose_records ORDER BY date ASC, scheduledTime ASC'
  );
  return rows.map(deserializeDoseRecord);
}

export async function insertDoseRecords(records: DoseRecord[]): Promise<void> {
  if (records.length === 0) return;
  await transaction(async (db) => {
    for (const r of records) {
      await db.runAsync(
        `INSERT OR IGNORE INTO dose_records (id, medicineId, scheduledTime, takenAt, date, isTaken)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [r.id, r.medicineId, r.scheduledTime, r.takenAt, r.date, r.isTaken ? 1 : 0]
      );
    }
  });
}

export async function upsertDoseRecords(records: DoseRecord[]): Promise<void> {
  if (records.length === 0) return;
  await transaction(async (db) => {
    for (const r of records) {
      await db.runAsync(
        `INSERT OR REPLACE INTO dose_records (id, medicineId, scheduledTime, takenAt, date, isTaken)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [r.id, r.medicineId, r.scheduledTime, r.takenAt, r.date, r.isTaken ? 1 : 0]
      );
    }
  });
}

export async function updateDoseRecord(record: DoseRecord): Promise<void> {
  await write((db) =>
    db.runAsync('UPDATE dose_records SET takenAt=?, isTaken=? WHERE id=?', [
      record.takenAt,
      record.isTaken ? 1 : 0,
      record.id,
    ])
  );
}

/** Inserts the record if missing and marks it taken, in one write. */
export async function markDoseTaken(record: DoseRecord, takenAt: string): Promise<void> {
  await transaction(async (db) => {
    await db.runAsync(
      `INSERT OR IGNORE INTO dose_records (id, medicineId, scheduledTime, takenAt, date, isTaken)
       VALUES (?, ?, ?, NULL, ?, 0)`,
      [record.id, record.medicineId, record.scheduledTime, record.date]
    );
    await db.runAsync('UPDATE dose_records SET takenAt=?, isTaken=1 WHERE id=?', [takenAt, record.id]);
  });
}

export async function deleteDoseRecords(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await transaction(async (db) => {
    for (const id of ids) {
      await db.runAsync('DELETE FROM dose_records WHERE id=?', [id]);
    }
  });
}

export async function clearAllDoseRecords(): Promise<void> {
  await write((db) => db.runAsync('DELETE FROM dose_records'));
}

export function deserializeDoseRecord(row: Record<string, unknown>): DoseRecord {
  return {
    id: row.id as string,
    medicineId: row.medicineId as string,
    scheduledTime: row.scheduledTime as string,
    takenAt: (row.takenAt as string | null) ?? null,
    date: row.date as string,
    isTaken: (row.isTaken as number) === 1,
  };
}
