/**
 * Shared SQLite connection. Opened lazily on first use; migrations run once,
 * gated by the `user_version` pragma so they are idempotent across launches.
 */
import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './schema';

const DB_NAME = 'mediremind.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = init().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

async function init(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await migrate(db);
  return db;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;

  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
    });
    // user_version cannot be parameterized; the value is a controlled integer.
    await db.execAsync(`PRAGMA user_version = ${version + 1};`);
  }

  // Pre-versioning installs created `medicines` before notificationOffset
  // existed; `CREATE TABLE IF NOT EXISTS` above leaves that table untouched.
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(medicines);');
  if (!cols.some((c) => c.name === 'notificationOffset')) {
    await db.execAsync(
      'ALTER TABLE medicines ADD COLUMN notificationOffset INTEGER NOT NULL DEFAULT 0;'
    );
  }
}
