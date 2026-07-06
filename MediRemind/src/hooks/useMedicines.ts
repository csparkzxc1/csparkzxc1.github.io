import { useEffect } from 'react';
import { useMedicineStore } from '../store/medicineStore';
import { Medicine } from '../types';
import { isPrescriptionExpiringSoon } from '../utils/prescriptionUtils';

export function useMedicines() {
  const {
    medicines,
    isLoading,
    loadMedicines,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    toggleActive,
    getMedicineById,
  } = useMedicineStore();

  useEffect(() => {
    loadMedicines();
  }, []);

  const activeMedicines = medicines.filter((m) => m.isActive);

  const expiringSoonMedicines = medicines.filter(
    (m) => m.prescription && isPrescriptionExpiringSoon(m.prescription, 7)
  );

  return {
    medicines,
    activeMedicines,
    expiringSoonMedicines,
    isLoading,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    toggleActive,
    getMedicineById,
    reload: loadMedicines,
  };
}
