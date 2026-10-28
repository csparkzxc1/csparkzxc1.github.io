import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import type { DoseRecord, RootStackParamList } from '../types';
import { useDoseStore } from '../store/doseStore';
import { useMedicineStore } from '../store/medicineStore';
import { useAddMedicine } from '../hooks/useAddMedicine';
import { useToday } from '../hooks/useToday';
import { useI18n } from '../i18n/I18nProvider';
import { formatLongDate } from '../i18n/core';
import { isPrescriptionExpiringSoon } from '../lib/prescription';
import { parseDateKey } from '../lib/schedule';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { cardShadow, type Scheme, type ThemeColors } from '../theme/theme';
import ScreenHeader from '../components/ScreenHeader';
import ProgressBar from '../components/ProgressBar';
import DoseItem from '../components/DoseItem';
import PrescriptionBanner from '../components/PrescriptionBanner';
import {
  ensurePermission,
  getReminderPermission,
  openSystemSettings,
  syncNotifications,
  type ReminderPermission,
} from '../notifications/notifications';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const today = useToday();

  const medicines = useMedicineStore((s) => s.medicines);
  const { doseRecords, isLoading, streak, markDose, unmarkDose, syncDoses } = useDoseStore();
  const addMedicine = useAddMedicine();

  const [permission, setPermission] = React.useState<ReminderPermission>('granted');
  React.useEffect(() => {
    const check = () => getReminderPermission().then(setPermission);
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);

  const enableReminders = async () => {
    if (permission === 'ask' && (await ensurePermission())) {
      setPermission('granted');
      await syncNotifications(medicines);
    } else {
      openSystemSettings();
    }
  };

  // Re-sync when the date rolls over or the schedule changes.
  const scheduleKey = medicines
    .map((m) => `${m.id}:${m.isActive}:${m.times.join(',')}:${JSON.stringify(m.days)}`)
    .join('|');
  React.useEffect(() => {
    syncDoses(medicines, today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleKey, today]);

  const refresh = useCallback(() => syncDoses(medicines, today), [medicines, today, syncDoses]);

  const todayRecords = useMemo(
    () =>
      doseRecords
        .filter((r) => r.date === today)
        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
    [doseRecords, today]
  );
  const takenCount = todayRecords.filter((r) => r.isTaken).length;
  const totalCount = todayRecords.length;
  const allDone = totalCount > 0 && takenCount === totalCount;

  const expiringSoon = medicines.filter(
    (m) => m.isActive && m.prescription && isPrescriptionExpiringSoon(m.prescription, 7)
  );

  const handleToggle = useCallback(
    (record: DoseRecord) => (record.isTaken ? unmarkDose(record.id) : markDose(record)),
    [markDose, unmarkDose]
  );

  const byId = useMemo(() => new Map(medicines.map((m) => [m.id, m])), [medicines]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        subtitle={formatLongDate(parseDateKey(today))}
        title={t('home.title')}
        right={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={addMedicine}
            accessibilityLabel={t('home.addA11y')}
          >
            <Ionicons name="add" size={26} color={colors.onBrand} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        {permission !== 'granted' && medicines.length > 0 && (
          <TouchableOpacity style={styles.permBanner} onPress={enableReminders} activeOpacity={0.85}>
            <Ionicons name="notifications-off" size={22} color={colors.danger} />
            <View style={styles.permBody}>
              <Text style={styles.permTitle}>{t('notif.permTitle')}</Text>
              <Text style={styles.permDesc}>{t('notif.permBody')}</Text>
            </View>
            <Text style={styles.permAction}>{t('home.permEnable')}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <ProgressBar
            progress={totalCount > 0 ? takenCount / totalCount : 0}
            takenCount={takenCount}
            totalCount={totalCount}
          />
          {streak > 0 && (
            <View style={styles.streakChip}>
              <Text style={styles.streakText}>{t('home.streak', { n: streak })}</Text>
            </View>
          )}
        </View>

        <PrescriptionBanner
          medicines={expiringSoon}
          onPressMedicine={(id) => navigation.navigate('MedicineForm', { medicineId: id })}
        />

        {totalCount === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="pill" size={60} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
            <Text style={styles.emptyDesc}>{t('home.emptyDesc')}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={addMedicine}>
              <Text style={styles.emptyBtnText}>{t('home.emptyCta')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {allDone && (
              <View style={styles.allDoneBanner}>
                <Text style={styles.allDoneText}>{t('home.allDone')}</Text>
              </View>
            )}
            {todayRecords.map((record) => (
              <DoseItem
                key={record.id}
                record={record}
                medicine={byId.get(record.medicineId)}
                onToggle={handleToggle}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors, scheme: Scheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    addBtn: {
      backgroundColor: c.brand,
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.brand,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 32 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 20,
      marginBottom: 12,
      ...cardShadow(c, scheme),
    },
    permBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.dangerSoft,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
    },
    permBody: { flex: 1 },
    permTitle: { fontSize: 15, fontWeight: '700', color: c.danger },
    permDesc: { fontSize: 12, color: c.text, marginTop: 2, lineHeight: 17 },
    permAction: { fontSize: 14, fontWeight: '800', color: c.danger },
    streakChip: {
      alignSelf: 'flex-start',
      marginTop: 14,
      backgroundColor: c.warningSoft,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    streakText: { color: c.warningText, fontSize: 13, fontWeight: '800' },
    allDoneBanner: {
      backgroundColor: c.success,
      borderRadius: 16,
      padding: 16,
      marginBottom: 6,
      alignItems: 'center',
    },
    allDoneText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    emptyState: { alignItems: 'center', paddingTop: 48, paddingBottom: 24 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: c.text, marginTop: 16, marginBottom: 8 },
    emptyDesc: {
      fontSize: 14,
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    emptyBtn: { backgroundColor: c.brand, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12 },
    emptyBtnText: { color: c.onBrand, fontSize: 15, fontWeight: '700' },
  });
