import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

import type { RootStackParamList } from '../types';
import { PRIVACY_POLICY_URL } from '../config';
import { useDoseStore } from '../store/doseStore';
import { useMedicineStore } from '../store/medicineStore';
import { useEntitlement } from '../purchase/EntitlementProvider';
import { FREE_MEDICINE_LIMIT, PURCHASE_CONFIG } from '../purchase/purchase.config';
import {
  loadReminderSettings,
  openSystemSettings,
  saveReminderSettings,
  sendTestNotification,
  syncNotifications,
  type ReminderSettings,
} from '../notifications/notifications';
import { exportBackup, importBackup } from '../lib/backup';
import { dateKey } from '../lib/schedule';
import { checkAndApplyUpdate, getBuildInfo } from '../utils/updateUtils';
import { useI18n } from '../i18n/I18nProvider';
import type { LanguagePref } from '../i18n/core';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { cardShadow, type Scheme, type ThemeColors, type ThemeMode } from '../theme/theme';
import ScreenHeader from '../components/ScreenHeader';
import { guardianAvailable } from '../guardian/config';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function SettingRow({
  icon,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
  danger,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + '22' }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, danger && { color: colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} /> : null)}
    </TouchableOpacity>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.segment}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          style={[styles.segmentItem, value === o.value && styles.segmentItemActive]}
          onPress={() => onChange(o.value)}
        >
          <Text style={[styles.segmentText, value === o.value && styles.segmentTextActive]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { t, pref: langPref, setLanguage } = useI18n();
  const { colors, mode, setMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { isPro, product, restore } = useEntitlement();

  const [settings, setSettings] = useState<ReminderSettings>({ sound: true, vibration: true });
  const [busy, setBusy] = useState<null | 'update' | 'export' | 'import' | 'restore'>(null);
  const buildInfo = getBuildInfo();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const { clearAllRecords, syncDoses } = useDoseStore();
  const { medicines, loadMedicines } = useMedicineStore();

  useEffect(() => {
    loadReminderSettings().then(setSettings).catch(() => {});
  }, []);

  const updateSettings = async (next: ReminderSettings) => {
    setSettings(next);
    Haptics.selectionAsync().catch(() => {});
    await saveReminderSettings(next);
    await syncNotifications(useMedicineStore.getState().medicines);
  };

  const handleTestNotification = async () => {
    const result = await sendTestNotification();
    if (result.status === 'denied') {
      Alert.alert(t('notif.permTitle'), t('notif.permBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('notif.openSettings'), onPress: openSystemSettings },
      ]);
      return;
    }
    // Make sure the real schedule is in place too.
    await syncNotifications(useMedicineStore.getState().medicines);
    Alert.alert(t('settings.testSentTitle'), t('settings.testSentBody', { n: result.scheduledDoses }));
  };

  const handleRestore = async () => {
    setBusy('restore');
    try {
      const ok = await restore();
      Alert.alert(
        ok ? t('settings.restoreDoneTitle') : t('settings.restoreNoneTitle'),
        ok ? t('settings.restoreDoneBody') : t('settings.restoreNoneBody')
      );
    } catch {
      Alert.alert(t('common.error'), t('settings.restoreFail'));
    } finally {
      setBusy(null);
    }
  };

  const handleExport = async () => {
    setBusy('export');
    try {
      await exportBackup();
    } catch (e) {
      console.warn('[settings] export failed', e);
      Alert.alert(t('common.error'), t('backup.exportFail'));
    } finally {
      setBusy(null);
    }
  };

  const handleImport = () => {
    Alert.alert(t('settings.importConfirmTitle'), t('settings.importConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.ok'),
        onPress: async () => {
          setBusy('import');
          try {
            const result = await importBackup();
            if (result.cancelled) return;
            await loadMedicines();
            const meds = useMedicineStore.getState().medicines;
            await syncDoses(meds, dateKey(new Date()));
            await syncNotifications(meds);
            Alert.alert(
              t('common.done'),
              t('settings.importDone', { m: result.medicines, r: result.doseRecords })
            );
          } catch (e) {
            Alert.alert(t('common.error'), e instanceof Error ? e.message : t('backup.readError'));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    Alert.alert(t('settings.resetTitle'), t('settings.resetBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.resetConfirm'),
        style: 'destructive',
        onPress: async () => {
          await clearAllRecords();
          await syncDoses(useMedicineStore.getState().medicines, dateKey(new Date()));
          Alert.alert(t('common.done'), t('settings.resetDone'));
        },
      },
    ]);
  };

  const handleCheckUpdate = async () => {
    if (__DEV__) {
      Alert.alert(t('settings.sectionUpdate'), t('settings.updateDev'));
      return;
    }
    setBusy('update');
    const result = await checkAndApplyUpdate();
    setBusy(null);
    if (result.isError) Alert.alert(t('common.error'), t('settings.updateFail'));
    else if (!result.isAvailable) Alert.alert(t('settings.sectionUpdate'), t('settings.updateLatest'));
  };

  const spinner = (key: typeof busy) =>
    busy === key ? <ActivityIndicator color={colors.brand} /> : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t('settings.title')} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ─ Plan ─ */}
        <Text style={styles.sectionLabel}>{t('settings.sectionPlan')}</Text>
        <View style={styles.card}>
          {isPro ? (
            <SettingRow icon="checkmark-done-circle" iconColor={colors.success} title={t('settings.planPro')} />
          ) : (
            <SettingRow
              icon="sparkles"
              iconColor={colors.brand}
              title={t('settings.planFree', { n: FREE_MEDICINE_LIMIT })}
              subtitle={t('settings.planFreeSub', {
                price: product?.priceLabel ?? PURCHASE_CONFIG.fallbackPriceLabel,
              })}
              onPress={() => navigation.navigate('Paywall')}
            />
          )}
          <View style={styles.divider} />
          <SettingRow
            icon="refresh"
            iconColor={colors.textMuted}
            title={t('settings.restore')}
            onPress={busy ? undefined : handleRestore}
            right={spinner('restore')}
          />
        </View>

        {/* ─ Family ─ */}
        {guardianAvailable() && (
          <>
            <Text style={styles.sectionLabel}>{t('settings.sectionFamily')}</Text>
            <View style={styles.card}>
              <SettingRow
                icon="people"
                iconColor={colors.success}
                title={t('settings.guardian')}
                subtitle={t('settings.guardianSub')}
                onPress={() => navigation.navigate('Guardian')}
              />
            </View>
          </>
        )}

        {/* ─ Notifications ─ */}
        <Text style={styles.sectionLabel}>{t('settings.sectionNotif')}</Text>
        <View style={styles.card}>
          <SettingRow
            icon="volume-high"
            iconColor={colors.brand}
            title={t('settings.sound')}
            right={
              <Switch
                value={settings.sound}
                onValueChange={(v) => updateSettings({ ...settings, sound: v })}
                trackColor={{ false: colors.surfaceMuted, true: colors.brand }}
                thumbColor="#FFF"
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="notifications-outline"
            iconColor={colors.success}
            title={t('settings.testNotif')}
            subtitle={t('settings.testNotifSub')}
            onPress={handleTestNotification}
          />
          {/* iOS decides notification vibration itself; the toggle only works on Android. */}
          {Platform.OS === 'android' && (
            <>
              <View style={styles.divider} />
              <SettingRow
                icon="phone-portrait"
                iconColor="#8B5CF6"
                title={t('settings.vibration')}
                right={
                  <Switch
                    value={settings.vibration}
                    onValueChange={(v) => updateSettings({ ...settings, vibration: v })}
                    trackColor={{ false: colors.surfaceMuted, true: '#8B5CF6' }}
                    thumbColor="#FFF"
                  />
                }
              />
            </>
          )}
        </View>

        {/* ─ Display ─ */}
        <Text style={styles.sectionLabel}>{t('settings.sectionDisplay')}</Text>
        <View style={[styles.card, styles.cardPadded]}>
          <Text style={styles.inlineLabel}>{t('settings.theme')}</Text>
          <Segmented<ThemeMode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'system', label: t('settings.themeSystem') },
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
            ]}
          />
          <Text style={[styles.inlineLabel, { marginTop: 16 }]}>{t('settings.language')}</Text>
          <Segmented<LanguagePref>
            value={langPref}
            onChange={setLanguage}
            options={[
              { value: 'system', label: t('settings.langSystem') },
              { value: 'ko', label: '한국어' },
              { value: 'en', label: 'English' },
            ]}
          />
        </View>

        {/* ─ Data ─ */}
        <Text style={styles.sectionLabel}>{t('settings.sectionData')}</Text>
        <View style={styles.card}>
          <SettingRow
            icon="share-outline"
            iconColor="#14B8A6"
            title={t('settings.export')}
            subtitle={t('settings.exportSub')}
            onPress={busy ? undefined : handleExport}
            right={spinner('export')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="download-outline"
            iconColor={colors.brand}
            title={t('settings.import')}
            subtitle={t('settings.importSub')}
            onPress={busy ? undefined : handleImport}
            right={spinner('import')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="trash-outline"
            iconColor={colors.danger}
            title={t('settings.reset')}
            subtitle={t('settings.resetSub', { n: medicines.length })}
            onPress={handleReset}
            danger
          />
        </View>

        {/* ─ Updates ─ */}
        <Text style={styles.sectionLabel}>{t('settings.sectionUpdate')}</Text>
        <View style={styles.card}>
          <SettingRow
            icon="cloud-download-outline"
            iconColor={colors.brand}
            title={busy === 'update' ? t('settings.checking') : t('settings.checkUpdate')}
            subtitle={
              buildInfo.channel ? t('settings.channel', { c: buildInfo.channel }) : t('settings.updateSub')
            }
            onPress={busy ? undefined : handleCheckUpdate}
          />
        </View>

        {/* ─ About ─ */}
        <Text style={styles.sectionLabel}>{t('settings.sectionInfo')}</Text>
        <View style={styles.card}>
          <SettingRow
            icon="shield-checkmark"
            iconColor="#14B8A6"
            title={t('settings.privacy')}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="information-circle"
            iconColor={colors.textMuted}
            title={t('settings.version')}
            subtitle={`v${version}${buildInfo.updateId ? ` · ${buildInfo.updateId.slice(0, 8)}` : ''}`}
          />
        </View>

        <Text style={styles.footer}>{t('settings.footer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors, scheme: Scheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textMuted,
      letterSpacing: 0.6,
      marginTop: 22,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 18,
      overflow: 'hidden',
      ...cardShadow(c, scheme),
    },
    cardPadded: { padding: 16 },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, minHeight: 58 },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: 15, fontWeight: '500', color: c.text },
    rowSubtitle: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginLeft: 66 },
    inlineLabel: { fontSize: 13, fontWeight: '600', color: c.textMuted, marginBottom: 8 },
    segment: { flexDirection: 'row', backgroundColor: c.surfaceMuted, borderRadius: 12, padding: 3 },
    segmentItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
    segmentItemActive: { backgroundColor: c.surface },
    segmentText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    segmentTextActive: { color: c.text },
    footer: {
      marginTop: 32,
      fontSize: 12,
      color: c.textFaint,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
