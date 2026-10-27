import { create } from 'zustand';
import type { Medicine } from '../types';
import {
  getAllMedicines,
  insertMedicine,
  updateMedicine as dbUpdateMedicine,
  deleteMedicine as dbDeleteMedicine,
} from '../db/medicineRepository';
import { syncNotifications } from '../notifications/notifications';

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

export const useMedicineStore = create<MedicineStoreState>((set, get) => {
  const resync = () => syncNotifications(get().medicines);

  return {
    medicines: [],
    isLoading: false,

    loadMedicines: async () => {
      set({ isLoading: true });
      try {
        set({ medicines: await getAllMedicines() });
      } catch (error) {
        console.error('[MedicineStore] loadMedicines error:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    addMedicine: async (medicine) => {
      await insertMedicine(medicine);
      set((s) => ({ medicines: [medicine, ...s.medicines] }));
      await resync();
    },

    updateMedicine: async (medicine) => {
      await dbUpdateMedicine(medicine);
      set((s) => ({ medicines: s.medicines.map((m) => (m.id === medicine.id ? medicine : m)) }));
      await resync();
    },

    deleteMedicine: async (id) => {
      await dbDeleteMedicine(id);
      set((s) => ({ medicines: s.medicines.filter((m) => m.id !== id) }));
      await resync();
    },

    toggleActive: async (id) => {
      const medicine = get().medicines.find((m) => m.id === id);
      if (!medicine) return;
      const updated = { ...medicine, isActive: !medicine.isActive };
      try {
        await dbUpdateMedicine(updated);
        set((s) => ({ medicines: s.medicines.map((m) => (m.id === id ? updated : m)) }));
        await resync();
      } catch (error) {
        console.error('[MedicineStore] toggleActive error:', error);
      }
    },

    getMedicineById: (id) => get().medicines.find((m) => m.id === id),
  };
});
