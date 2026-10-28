import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useMedicineStore } from '../store/medicineStore';
import { useEntitlement } from '../purchase/EntitlementProvider';
import { canAddMedicine } from '../purchase/limits';

/** Opens the add-medicine form, or the paywall once the free limit is reached. */
export function useAddMedicine(): () => void {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const count = useMedicineStore((s) => s.medicines.length);
  const { isPro } = useEntitlement();

  return useCallback(() => {
    if (canAddMedicine(isPro, count)) navigation.navigate('MedicineForm');
    else navigation.navigate('Paywall', { reason: 'limit' });
  }, [isPro, count, navigation]);
}
