import { FREE_MEDICINE_LIMIT } from './purchase.config';

/** Whether another medicine can be added. Inactive medicines still count. */
export function canAddMedicine(isPro: boolean, medicineCount: number): boolean {
  return isPro || medicineCount < FREE_MEDICINE_LIMIT;
}
