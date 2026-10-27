/**
 * SQLite schema for MediRemind, applied in order and tracked by the
 * `user_version` pragma (see database.ts). To evolve the schema, append a new
 * entry — never edit an existing one, or installed devices will skip it.
 */
export const MIGRATIONS: string[] = [
  // v1 — medicines, dose records, key/value settings
  `
  CREATE TABLE IF NOT EXISTS medicines (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    times TEXT NOT NULL,
    days TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#4A6CF7',
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

  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];
