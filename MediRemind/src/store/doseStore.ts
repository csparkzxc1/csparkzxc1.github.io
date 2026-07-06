import { create } from 'zustand';
import { format } from 'date-fns';
import { DoseRecord, Medicine } from '../types';
import {
  getDoseRecordsByDate,
  getDoseRecordsByDateRange,
  insertDoseRecord,
  updateDoseRecord,
  deleteDoseRecord,
  clearAllDoseRecords,
} from '../services/databaseService';
import { isMedicineScheduledForDate } from '../utils/dateUtils';

interface DoseStoreState {
  doseRecords: DoseRecord[];
  rangeRecords: DoseRecord[];
  isLoading: boolean;
  loadDoseRecords: (date: string) => Promise<void>;
  loadDoseRecordsRange: (startDate: string, endDate: string) => Promise<void>;
  markDose: (record: DoseRecord) => Promise<void>;
  unmarkDose: (recordId: string) => Promise<void>;
  generateDosesForDate: (medicines: Medicine[], date: string) => Promise<void>;
  clearAllRecords: () => Promise<void>;
}

function generateRecordId(medicineId: string, date: string, time: string): string {
  return `${medicineId}_${date}_${time.replace(':', '')}`;
}

export const useDoseStore = create<DoseStoreState>((set, get) => ({
  doseRecords: [],
  rangeRecords: [],
  isLoading: false,

  loadDoseRecords: async (date: string) => {
    set({ isLoading: true });
    try {
      const records = await getDoseRecordsByDate(date);
      set({ doseRecords: records });
    } catch (error) {
      console.error('[DoseStore] loadDoseRecords error:', error);
      set({ doseRecords: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  loadDoseRecordsRange: async (startDate: string, endDate: string) => {
    try {
      const records = await getDoseRecordsByDateRange(startDate, endDate);
      set({ rangeRecords: records });
    } catch (error) {
      console.error('[DoseStore] loadDoseRecordsRange error:', error);
      set({ rangeRecords: [] });
    }
  },

  markDose: async (record: DoseRecord) => {
    const takenRecord: DoseRecord = {
      ...record,
      isTaken: true,
      takenAt: new Date().toISOString(),
    };
    try {
      // Check if exists
      const existing = get().doseRecords.find((r) => r.id === record.id);
      if (existing) {
        await updateDoseRecord(takenRecord);
      } else {
        await insertDoseRecord(takenRecord);
      }
      set((state) => ({
        doseRecords: state.doseRecords.map((r) =>
          r.id === record.id ? takenRecord : r
        ),
      }));
    } catch (error) {
      console.error('[DoseStore] markDose error:', error);
    }
  },

  unmarkDose: async (recordId: string) => {
    const unMarked = get().doseRecords.find((r) => r.id === recordId);
    if (!unMarked) return;
    const updated = { ...unMarked, isTaken: false, takenAt: null };
    try {
      await updateDoseRecord(updated);
      set((state) => ({
        doseRecords: state.doseRecords.map((r) =>
          r.id === recordId ? updated : r
        ),
      }));
    } catch (error) {
      console.error('[DoseStore] unmarkDose error:', error);
    }
  },

  generateDosesForDate: async (medicines: Medicine[], date: string) => {
    try {
      const existing = await getDoseRecordsByDate(date);

      // Build expected record IDs from current medicine schedules
      const expectedIds = new Set<string>();
      const toInsert: DoseRecord[] = [];
      const existingIds = new Set(existing.map((r) => r.id));

      for (const med of medicines) {
        if (!med.isActive) continue;
        if (!isMedicineScheduledForDate(med, date)) continue;

        for (const time of med.times) {
          const id = generateRecordId(med.id, date, time);
          expectedIds.add(id);
          if (!existingIds.has(id)) {
            toInsert.push({
              id,
              medicineId: med.id,
              scheduledTime: time,
              takenAt: null,
              date,
              isTaken: false,
            });
          }
        }
      }

      // Remove untaken records that no longer match current schedule
      for (const rec of existing) {
        if (!rec.isTaken && !expectedIds.has(rec.id)) {
          await deleteDoseRecord(rec.id);
        }
      }

      for (const record of toInsert) {
        await insertDoseRecord(record);
      }

      const all = await getDoseRecordsByDate(date);
      set({ doseRecords: all });
    } catch (error) {
      console.error('[DoseStore] generateDosesForDate error:', error);
    }
  },

  clearAllRecords: async () => {
    try {
      await clearAllDoseRecords();
      set({ doseRecords: [], rangeRecords: [] });
    } catch (error) {
      console.error('[DoseStore] clearAllRecords error:', error);
      throw error;
    }
  },
}));
