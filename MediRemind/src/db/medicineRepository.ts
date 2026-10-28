import { getDb, transaction, write } from './database';
import type { Medicine } from '../types';

export async function getAllMedicines(): Promise<Medicine[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM medicines ORDER BY createdAt DESC'
  );
  return rows.map(deserializeMedicine);
}

// A plain REPLACE would delete the old row first, and ON DELETE CASCADE would
// take the medicine's dose history with it, so upsert in place instead.
export const UPSERT_MEDICINE_SQL = `
  INSERT INTO medicines
    (id, name, dosage, times, days, color, memo, isActive, createdAt, prescription, notificationOffset)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name=excluded.name, dosage=excluded.dosage, times=excluded.times, days=excluded.days,
    color=excluded.color, memo=excluded.memo, isActive=excluded.isActive,
    createdAt=excluded.createdAt, prescription=excluded.prescription,
    notificationOffset=excluded.notificationOffset`;

export async function insertMedicine(medicine: Medicine): Promise<void> {
  await write((db) => db.runAsync(UPSERT_MEDICINE_SQL, serializeMedicine(medicine)));
}

export async function updateMedicine(medicine: Medicine): Promise<void> {
  await write((db) =>
    db.runAsync(
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
    )
  );
}

export async function deleteMedicine(id: string): Promise<void> {
  await transaction(async (db) => {
    await db.runAsync('DELETE FROM dose_records WHERE medicineId=?', [id]);
    await db.runAsync('DELETE FROM medicines WHERE id=?', [id]);
  });
}

export function serializeMedicine(m: Medicine): (string | number | null)[] {
  return [
    m.id,
    m.name,
    m.dosage,
    JSON.stringify(m.times),
    JSON.stringify(m.days),
    m.color,
    m.memo,
    m.isActive ? 1 : 0,
    m.createdAt,
    m.prescription ? JSON.stringify(m.prescription) : null,
    m.notificationOffset ?? 0,
  ];
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function deserializeMedicine(row: Record<string, unknown>): Medicine {
  return {
    id: row.id as string,
    name: row.name as string,
    dosage: row.dosage as string,
    times: parseJson<string[]>(row.times, []),
    days: parseJson<Medicine['days']>(row.days, 'everyday'),
    color: row.color as string,
    memo: (row.memo as string) ?? '',
    isActive: (row.isActive as number) === 1,
    createdAt: row.createdAt as string,
    prescription: parseJson<Medicine['prescription']>(row.prescription, null),
    notificationOffset: (row.notificationOffset as number) ?? 0,
  };
}
