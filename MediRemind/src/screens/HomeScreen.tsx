import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../types';
import { useTodayDoses } from '../hooks/useTodayDoses';
import { useMedicines } from '../hooks/useMedicines';
import { useDoseStore } from '../store/doseStore';
import { useMedicineStore } from '../store/medicineStore';
import ProgressBar from '../components/ProgressBar';
import DoseItem from '../components/DoseItem';
import PrescriptionBanner from '../components/PrescriptionBanner';
import AdBanner from '../components/AdBanner';
import { formatTodayDisplay } from '../utils/dateUtils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const {
    doseRecords,
    isLoading,
    takenCount,
    totalCount,
    completionRate,
    markDose,
    unmarkDose,
    refresh,
  } = useTodayDoses();
  const { medicines, expiringSoonMedicines } = useMedicines();
  const { getMedicineById } = useMedicineStore();

  const handleToggleDose = useCallback(
    async (record: (typeof doseRecords)[0]) => {
      if (record.isTaken) {
        await unmarkDose(record.id);
      } else {
        await markDose(record);
      }
    },
    [markDose, unmarkDose]
  );

  const handlePressMedicine = (medicineId: string) => {
    navigation.navigate('MedicineForm', { medicineId });
  };

  const today = formatTodayDisplay(new Date());

  const sortedRecords = [...doseRecords].sort((a, b) =>
    a.scheduledTime.localeCompare(b.scheduledTime)
  );

  const allDone = totalCount > 0 && takenCount === totalCount;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>{today}</Text>
          <Text style={styles.headerTitle}>오늘의 복용 현황</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('MedicineForm', undefined)}
          accessibilityLabel="약 추가"
        >
          <Ionicons name="add" size={26} color="#4A90D9" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor="#4A90D9" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Card */}
        <View style={styles.card}>
          <ProgressBar
            progress={completionRate}
            takenCount={takenCount}
            totalCount={totalCount}
          />
        </View>

        {/* Prescription Expiry Banner */}
        {expiringSoonMedicines.length > 0 && (
          <PrescriptionBanner
            medicines={expiringSoonMedicines}
            onPressMedicine={handlePressMedicine}
          />
        )}

        {/* Dose List */}
        {totalCount === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={60} color="#CCC" />
            <Text style={styles.emptyTitle}>오늘 복용할 약이 없어요</Text>
            <Text style={styles.emptyDesc}>
              약을 등록하면 복용 알림을 받을 수 있어요
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('MedicineForm', undefined)}
            >
              <Text style={styles.emptyBtnText}>+ 약 등록하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {allDone && (
              <View style={styles.allDoneBanner}>
                <Text style={styles.allDoneText}>🎉 오늘 약을 모두 드셨어요!</Text>
              </View>
            )}
            {sortedRecords.map((record) => {
              const medicine = getMedicineById(record.medicineId);
              return (
                <DoseItem
                  key={record.id}
                  record={record}
                  medicine={medicine}
                  onToggle={handleToggleDose}
                />
              );
            })}
          </>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4A90D9',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  dateText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 2,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  addBtn: {
    backgroundColor: '#FFFFFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  allDoneBanner: {
    backgroundColor: '#5CB85C',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  allDoneText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  spacer: {
    height: 16,
  },
});
