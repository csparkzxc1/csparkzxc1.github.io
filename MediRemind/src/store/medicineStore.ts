import { create } from 'zustand';
import { Medicine } from '../types';
import {
  getAllMedicines,
  insertMedicine,
  updateMedicine as dbUpdateMedicine,
  deleteMedicine as dbDeleteMedicine,
} from '../services/databaseService';
import { scheduleNotificationsForMedicine, cancelNotificationsForMedicine } from '../services/notificationService';

interface MedicineStoreState {
  medicines: Medicine[];
  isLoading: boolean;
  loadMedicines: () => Promise<void>;
  addMedicine: (medicine: Medicine) => Promise<void>;
  updateMedicine: (medicine: Medicine) => Promise<void>;
  deleteMedicine: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  getMedicineById: (id: string) => Medicine | undefined;
}

export const useMedicineStore = create<MedicineStoreState>((set, get) => ({
  medicines: [],
  isLoading: false,

  loadMedicines: async () => {
    set({ isLoading: true });
    try {
      const medicines = await getAllMedicines();
      set({ medicines });
    } catch (error) {
      console.error('[MedicineStore] loadMedicines error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addMedicine: async (medicine: Medicine) => {
    try {
      await insertMedicine(medicine);
      set((state) => ({ medicines: [medicine, ...state.medicines] }));
      if (medicine.isActive) {
        await scheduleNotificationsForMedicine(medicine);
      }
    } catch (error) {
      console.error('[MedicineStore] addMedicine error:', error);
      throw error;
    }
  },

  updateMedicine: async (medicine: Medicine) => {
    try {
      await dbUpdateMedicine(medicine);
      set((state) => ({
        medicines: state.medicines.map((m) =>
          m.id === medicine.id ? medicine : m
        ),
      }));
      await cancelNotificationsForMedicine(medicine.id);
      if (medicine.isActive) {
        await scheduleNotificationsForMedicine(medicine);
      }
    } catch (error) {
      console.error('[MedicineStore] updateMedicine error:', error);
      throw error;
    }
  },

  deleteMedicine: async (id: string) => {
    try {
      await dbDeleteMedicine(id);
      await cancelNotificationsForMedicine(id);
      set((state) => ({
        medicines: state.medicines.filter((m) => m.id !== id),
      }));
    } catch (error) {
      console.error('[MedicineStore] deleteMedicine error:', error);
      throw error;
    }
  },

  toggleActive: async (id: string) => {
    const medicine = get().medicines.find((m) => m.id === id);
    if (!medicine) return;
    const updated = { ...medicine, isActive: !medicine.isActive };
    try {
      await dbUpdateMedicine(updated);
      set((state) => ({
        medicines: state.medicines.map((m) => (m.id === id ? updated : m)),
      }));
      if (updated.isActive) {
        await scheduleNotificationsForMedicine(updated);
      } else {
        await cancelNotificationsForMedicine(id);
      }
    } catch (error) {
      console.error('[MedicineStore] toggleActive error:', error);
    }
  },

  getMedicineById: (id: string) => {
    return get().medicines.find((m) => m.id === id);
  },
}));
