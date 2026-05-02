import { useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useDoseStore } from '../store/doseStore';
import { useMedicineStore } from '../store/medicineStore';

export function useTodayDoses() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { doseRecords, isLoading, loadDoseRecords, markDose, unmarkDose, generateDosesForDate } =
    useDoseStore();
  const { medicines } = useMedicineStore();

  const refresh = useCallback(async () => {
    await generateDosesForDate(medicines, today);
    await loadDoseRecords(today);
  }, [medicines, today]);

  useEffect(() => {
    refresh();
  }, [medicines.length, today]);

  const takenCount = doseRecords.filter((r) => r.isTaken).length;
  const totalCount = doseRecords.length;

  const completionRate = totalCount > 0 ? takenCount / totalCount : 0;

  return {
    doseRecords,
    isLoading,
    takenCount,
    totalCount,
    completionRate,
    markDose,
    unmarkDose,
    refresh,
    today,
  };
}
