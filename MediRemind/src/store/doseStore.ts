import { create } from 'zustand';
import type { DoseRecord, Medicine } from '../types';
import {
  clearAllDoseRecords,
  deleteDoseRecords,
  getDoseRecordsByDate,
  getDoseRecordsByDateRange,
  insertDoseRecords,
  markDoseTaken,
  updateDoseRecord,
} from '../db/doseRepository';
import { kvGet, kvSet, KV_KEYS } from '../db/kv';
import { addDays, dateKey, dateRange, doseRecordId, expectedDoseRecords } from '../lib/schedule';
import { computeStreak } from '../lib/streak';
import type { DoseToMark } from '../notifications/notifications';

/** How far back missed days are filled in after the app wasn't opened. */
const MAX_BACKFILL_DAYS = 60;
/** Window scanned for the streak. */
const STREAK_LOOKBACK_DAYS = 400;

interface DoseStoreState {
  /** Records for the date most recently loaded (home: today, calendar: selection). */
  doseRecords: DoseRecord[];
  rangeRecords: DoseRecord[];
  streak: number;
  isLoading: boolean;
  loadDoseRecords: (date: string) => Promise<void>;
  loadDoseRecordsRange: (startDate: string, endDate: string) => Promise<void>;
  /** Fills in records for days since the last launch, then syncs `today`. */
  syncDoses: (medicines: Medicine[], today: string) => Promise<void>;
  markDose: (record: DoseRecord) => Promise<void>;
  unmarkDose: (recordId: string) => Promise<void>;
  markFromNotification: (medicines: Medicine[], doses: DoseToMark[]) => Promise<void>;
  refreshStreak: () => Promise<void>;
  clearAllRecords: () => Promise<void>;
}

export const useDoseStore = create<DoseStoreState>((set, get) => ({
  doseRecords: [],
  rangeRecords: [],
  streak: 0,
  isLoading: false,

  loadDoseRecords: async (date) => {
    set({ isLoading: true });
    try {
      set({ doseRecords: await getDoseRecordsByDate(date) });
    } catch (error) {
      console.error('[DoseStore] loadDoseRecords error:', error);
      set({ doseRecords: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  loadDoseRecordsRange: async (startDate, endDate) => {
    try {
      set({ rangeRecords: await getDoseRecordsByDateRange(startDate, endDate) });
    } catch (error) {
      console.error('[DoseStore] loadDoseRecordsRange error:', error);
      set({ rangeRecords: [] });
    }
  },

  syncDoses: async (medicines, today) => {
    try {
      // Past days: only add what's missing, so history isn't rewritten when a
      // medicine's schedule changes later.
      const last = await kvGet(KV_KEYS.lastGeneratedDate);
      const earliest = addDays(today, -MAX_BACKFILL_DAYS);
      const from = last && last > earliest ? addDays(last, 1) : today;
      const pastDays = dateRange(from, addDays(today, -1));
      for (const date of pastDays) {
        await insertDoseRecords(expectedDoseRecords(medicines, date));
      }

      // Today: also drop untaken records the current schedule no longer has.
      const expected = expectedDoseRecords(medicines, today);
      const expectedIds = new Set(expected.map((r) => r.id));
      const existing = await getDoseRecordsByDate(today);
      await deleteDoseRecords(
        existing.filter((r) => !r.isTaken && !expectedIds.has(r.id)).map((r) => r.id)
      );
      await insertDoseRecords(expected);
      await kvSet(KV_KEYS.lastGeneratedDate, today);

      set({ doseRecords: await getDoseRecordsByDate(today) });
      await get().refreshStreak();
    } catch (error) {
      console.error('[DoseStore] syncDoses error:', error);
    }
  },

  markDose: async (record) => {
    const taken: DoseRecord = { ...record, isTaken: true, takenAt: new Date().toISOString() };
    set((s) => ({ doseRecords: s.doseRecords.map((r) => (r.id === record.id ? taken : r)) }));
    try {
      await markDoseTaken(record, taken.takenAt!);
      await get().refreshStreak();
    } catch (error) {
      console.error('[DoseStore] markDose error:', error);
      set((s) => ({ doseRecords: s.doseRecords.map((r) => (r.id === record.id ? record : r)) }));
    }
  },

  unmarkDose: async (recordId) => {
    const prev = get().doseRecords.find((r) => r.id === recordId);
    if (!prev) return;
    const updated: DoseRecord = { ...prev, isTaken: false, takenAt: null };
    set((s) => ({ doseRecords: s.doseRecords.map((r) => (r.id === recordId ? updated : r)) }));
    try {
      await updateDoseRecord(updated);
      await get().refreshStreak();
    } catch (error) {
      console.error('[DoseStore] unmarkDose error:', error);
      set((s) => ({ doseRecords: s.doseRecords.map((r) => (r.id === recordId ? prev : r)) }));
    }
  },

  markFromNotification: async (medicines, doses) => {
    const takenAt = new Date().toISOString();
    for (const d of doses) {
      if (!medicines.some((m) => m.id === d.medicineId)) continue;
      await markDoseTaken(
        {
          id: doseRecordId(d.medicineId, d.date, d.time),
          medicineId: d.medicineId,
          scheduledTime: d.time,
          date: d.date,
          isTaken: false,
          takenAt: null,
        },
        takenAt
      );
    }
    const today = dateKey(new Date());
    set({ doseRecords: await getDoseRecordsByDate(today) });
    await get().refreshStreak();
  },

  refreshStreak: async () => {
    const today = dateKey(new Date());
    const records = await getDoseRecordsByDateRange(addDays(today, -STREAK_LOOKBACK_DAYS), today);
    set({ streak: computeStreak(records, today) });
  },

  clearAllRecords: async () => {
    await clearAllDoseRecords();
    set({ doseRecords: [], rangeRecords: [], streak: 0 });
  },
}));
