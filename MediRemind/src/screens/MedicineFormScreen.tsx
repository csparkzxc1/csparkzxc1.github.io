import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { COLOR_TAGS, type ColorTag, type Medicine, type RootStackParamList } from '../types';
import { useMedicineStore } from '../store/medicineStore';
import { useI18n } from '../i18n/I18nProvider';
import { formatTime, weekdayLabels } from '../i18n/core';
import { uid } from '../lib/id';
import { useEntitlement } from '../purchase/EntitlementProvider';
import { canAddMedicine } from '../purchase/limits';
import { normalizeTime } from '../lib/time';
import { dateKey } from '../lib/schedule';
import { isValidDateKey } from '../lib/prescription';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { cardShadow, type Scheme, type ThemeColors } from '../theme/theme';

type RouteParams = RouteProp<RootStackParamList, 'MedicineForm'>;

// ─── Constants ───────────────────────────────────────────────────────────────

const DOSAGE_AMOUNTS = ['0.5', '1', '1.5', '2', '3', '5', '10'];
const DOSAGE_UNITS = ['정', '캡슐', '포', 'mg', 'mL'];
const DEFAULT_UNIT = '정';

type FreqOption = '1' | '2' | '3' | '4' | '5' | '6' | 'custom';
type DayMode = 'everyday' | 'weekday' | 'weekend' | 'custom';

const DEFAULT_TIMES = ['08:00', '12:00', '18:00', '21:00', '10:00', '15:00'];
const OFFSETS = [0, 5, 10, 15, 30];
const ALERT_DAYS = [3, 5, 7, 14];

function presetDosage(amount: string): string {
  return `${amount}${DEFAULT_UNIT}`;
}

/** Splits '2.5정' into ['2.5', '정']; unknown formats keep everything as amount. */
function splitDosage(dosage: string): { amount: string; unit: string } {
  const unit = DOSAGE_UNITS.find((u) => dosage.endsWith(u));
  if (unit) return { amount: dosage.slice(0, -unit.length).trim(), unit };
  return { amount: dosage, unit: '' };
}

function initialFreq(len: number): FreqOption {
  return len >= 1 && len <= 6 ? (String(len) as FreqOption) : 'custom';
}

function sortedTimes(times: string[]): string[] {
  return [...times].sort();
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MedicineFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteParams>();
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const medicineId = route.params?.medicineId;
  const { medicines, getMedicineById, addMedicine, updateMedicine, deleteMedicine } = useMedicineStore();
  const { isPro } = useEntitlement();
  const existing = medicineId ? getMedicineById(medicineId) : undefined;

  useLayoutEffect(() => {
    navigation.setOptions({ title: existing ? t('nav.editMedicine') : t('nav.addMedicine') });
  }, [navigation, existing, t]);

  // ─── State ───────────────────────────────────────────────────────────────

  const [name, setName] = useState(existing?.name ?? '');
  const [dosage, setDosage] = useState(existing?.dosage ?? presetDosage('1'));
  const [dosageCustom, setDosageCustom] = useState(
    () => !DOSAGE_AMOUNTS.map(presetDosage).includes(existing?.dosage ?? presetDosage('1'))
  );
  const initialSplit = splitDosage(existing?.dosage ?? '');
  const [customAmount, setCustomAmount] = useState(dosageCustom ? initialSplit.amount : '');
  const [customUnit, setCustomUnit] = useState(
    dosageCustom && initialSplit.unit ? initialSplit.unit : DEFAULT_UNIT
  );

  const [memo, setMemo] = useState(existing?.memo ?? '');
  const [color, setColor] = useState<string>(existing?.color ?? COLOR_TAGS[0]);

  const [freq, setFreq] = useState<FreqOption>(initialFreq(existing?.times.length ?? 1));
  const [customFreqText, setCustomFreqText] = useState(
    freq === 'custom' ? String(existing?.times.length ?? '') : ''
  );
  const [times, setTimes] = useState<string[]>(existing?.times ?? [DEFAULT_TIMES[0]]);

  const [dayMode, setDayMode] = useState<DayMode>(() => {
    const d = existing?.days ?? 'everyday';
    return Array.isArray(d) ? 'custom' : d;
  });
  const [selectedDays, setSelectedDays] = useState<number[]>(
    Array.isArray(existing?.days) ? existing.days : [0, 1, 2, 3, 4, 5, 6]
  );

  const [notificationOffset, setNotificationOffset] = useState(existing?.notificationOffset ?? 0);

  const [hasPrescription, setHasPrescription] = useState(!!existing?.prescription);
  const [prescStartDate, setPrescStartDate] = useState(
    existing?.prescription?.startDate ?? dateKey(new Date())
  );
  const [prescDays, setPrescDays] = useState(String(existing?.prescription?.totalDays ?? 30));
  const [alertDays, setAlertDays] = useState<number[]>(existing?.prescription?.alertDays ?? [7]);

  // Keep the number of time slots in step with the frequency chip.
  useEffect(() => {
    if (freq === 'custom') return;
    resizeTimes(parseInt(freq, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freq]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  function resizeTimes(count: number) {
    setTimes((prev) => {
      if (prev.length === count) return prev;
      if (prev.length > count) return prev.slice(0, count);
      const next = [...prev];
      for (const candidate of DEFAULT_TIMES) {
        if (next.length >= count) break;
        if (!next.includes(candidate)) next.push(candidate);
      }
      while (next.length < count) next.push('12:00');
      return sortedTimes(next);
    });
  }

  const applyCustomFreq = () => {
    const n = parseInt(customFreqText, 10);
    if (Number.isNaN(n) || n < 1 || n > 20) {
      Alert.alert(t('form.errTitle'), t('form.errFreq'));
      return;
    }
    resizeTimes(n);
  };

  const updateCustomDosage = (amount: string, unit: string) => {
    const clean = amount.replace(',', '.').replace(/[^0-9.]/g, '');
    setCustomAmount(clean);
    setCustomUnit(unit);
    setDosage(clean ? `${clean}${unit}` : '');
  };

  const toggle = (list: number[], value: number) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const removeTime = (idx: number) => {
    if (times.length <= 1) return;
    const next = times.filter((_, i) => i !== idx);
    setTimes(next);
    if (freq !== 'custom') setFreq(initialFreq(next.length));
  };

  const addTime = () => setTimes((prev) => [...prev, '12:00']);

  // ─── Save ────────────────────────────────────────────────────────────────

  // Deleting also removes the dose history, so it always asks first.
  const handleDelete = () => {
    if (!existing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(t('list.deleteTitle'), t('list.deleteBody', { name: existing.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMedicine(existing.id);
            navigation.goBack();
          } catch (e) {
            console.warn('[form] delete failed', e);
            Alert.alert(t('common.error'), t('form.errSave'));
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!existing && !canAddMedicine(isPro, medicines.length)) {
      navigation.navigate('Paywall', { reason: 'limit' });
      return;
    }
    const finalTimes = sortedTimes([...new Set(times.map(normalizeTime))]);
    if (!name.trim()) return Alert.alert(t('form.errTitle'), t('form.errName'));
    if (!dosage.trim()) return Alert.alert(t('form.errTitle'), t('form.errDosage'));
    if (finalTimes.length === 0) return Alert.alert(t('form.errTitle'), t('form.errTimes'));

    const days: Medicine['days'] =
      dayMode !== 'custom'
        ? dayMode
        : selectedDays.length > 0
          ? [...selectedDays].sort()
          : 'everyday';

    let prescription: Medicine['prescription'] = null;
    if (hasPrescription) {
      if (!isValidDateKey(prescStartDate)) return Alert.alert(t('form.errTitle'), t('form.errDate'));
      const totalDays = parseInt(prescDays, 10);
      if (Number.isNaN(totalDays) || totalDays < 1) {
        return Alert.alert(t('form.errTitle'), t('form.errPrescDays'));
      }
      prescription = { startDate: prescStartDate, totalDays, alertDays: [...alertDays].sort((a, b) => a - b) };
    }

    const medicine: Medicine = {
      id: existing?.id ?? uid(),
      name: name.trim(),
      dosage: dosage.trim(),
      times: finalTimes,
      days,
      color,
      memo: memo.trim(),
      isActive: existing?.isActive ?? true,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      prescription,
      notificationOffset,
    };

    try {
      if (existing) await updateMedicine(medicine);
      else await addMedicine(medicine);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      navigation.goBack();
    } catch (e) {
      console.warn('[form] save failed', e);
      Alert.alert(t('common.error'), t('form.errSave'));
    }
  };

  // ─── Render helpers ──────────────────────────────────────────────────────

  const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const placeholderColor = colors.textFaint;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─ Basics ─ */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('form.basic')}</Text>

          <Text style={styles.label}>{t('form.name')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('form.namePlaceholder')}
            placeholderTextColor={placeholderColor}
            maxLength={40}
          />

          <Text style={styles.label}>{t('form.dosage')}</Text>
          <View style={styles.chipRow}>
            {DOSAGE_AMOUNTS.map((amount) => {
              const value = presetDosage(amount);
              return (
                <Chip
                  key={value}
                  label={value}
                  active={!dosageCustom && dosage === value}
                  onPress={() => {
                    setDosageCustom(false);
                    setDosage(value);
                  }}
                />
              );
            })}
            <Chip
              label={t('form.dosageCustom')}
              active={dosageCustom}
              onPress={() => {
                setDosageCustom(true);
                updateCustomDosage(customAmount, customUnit);
              }}
            />
          </View>

          {dosageCustom && (
            <View style={styles.customDosage}>
              <TextInput
                style={[styles.input, styles.customAmountInput]}
                value={customAmount}
                onChangeText={(v) => updateCustomDosage(v, customUnit)}
                placeholder="2.5"
                placeholderTextColor={placeholderColor}
                keyboardType="decimal-pad"
                maxLength={6}
                selectTextOnFocus
                autoFocus
              />
              <View style={[styles.chipRow, styles.unitRow]}>
                {DOSAGE_UNITS.map((unit) => (
                  <Chip
                    key={unit}
                    label={unit}
                    active={customUnit === unit}
                    onPress={() => updateCustomDosage(customAmount, unit)}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* ─ Schedule ─ */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('form.schedule')}</Text>

          <Text style={styles.label}>{t('form.frequency')}</Text>
          <View style={styles.freqGrid}>
            {(['1', '2', '3', '4', '5', '6'] as FreqOption[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.freqChip, freq === f && styles.chipActive]}
                onPress={() => setFreq(f)}
              >
                <Text style={[styles.freqChipText, freq === f && styles.chipTextActive]}>
                  {t('form.freqUnit', { n: f })}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.freqChip, freq === 'custom' && styles.chipActive]}
              onPress={() => {
                setFreq('custom');
                setCustomFreqText(String(times.length));
              }}
            >
              <Text style={[styles.freqChipText, freq === 'custom' && styles.chipTextActive]}>
                {t('form.freqCustom')}
              </Text>
            </TouchableOpacity>
          </View>

          {freq === 'custom' && (
            <View style={styles.customFreqRow}>
              <TextInput
                style={styles.customFreqInput}
                value={customFreqText}
                onChangeText={(v) => setCustomFreqText(v.replace(/[^0-9]/g, ''))}
                placeholder={t('form.freqCustomPlaceholder')}
                placeholderTextColor={placeholderColor}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="done"
                onSubmitEditing={applyCustomFreq}
              />
              <Text style={styles.customFreqUnit}>{t('form.freqCustomHint')}</Text>
              <TouchableOpacity style={styles.applyBtn} onPress={applyCustomFreq}>
                <Text style={styles.applyText}>{t('form.apply')}</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>{t('form.times')}</Text>
          {times.map((time, idx) => (
            <View key={idx} style={styles.timeRow}>
              <View style={styles.timeInputWrapper}>
                <Ionicons name="time-outline" size={18} color={colors.brand} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.timeInput}
                  value={time}
                  onChangeText={(v) =>
                    setTimes((prev) => prev.map((p, i) => (i === idx ? v.replace(/[^0-9:]/g, '') : p)))
                  }
                  onBlur={() => setTimes((prev) => sortedTimes(prev.map(normalizeTime)))}
                  selectTextOnFocus
                  keyboardType="numbers-and-punctuation"
                  placeholder="08:30"
                  placeholderTextColor={placeholderColor}
                  maxLength={5}
                  accessibilityLabel={`${t('form.times')} ${idx + 1}`}
                />
                {time.length > 0 && <Text style={styles.timeAmPm}>{formatTime(normalizeTime(time))}</Text>}
              </View>
              {times.length > 1 && (
                <TouchableOpacity style={styles.removeTimeBtn} onPress={() => removeTime(idx)}>
                  <Ionicons name="remove-circle" size={24} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {freq === 'custom' && (
            <TouchableOpacity style={styles.addTimeBtn} onPress={addTime}>
              <Ionicons name="add-circle-outline" size={20} color={colors.brand} />
              <Text style={styles.addTimeText}>{t('form.addTime')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─ Days ─ */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('form.days')}</Text>
          <View style={styles.segRow}>
            {(['everyday', 'weekday', 'weekend', 'custom'] as DayMode[]).map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.seg, dayMode === d && styles.chipActive]}
                onPress={() => setDayMode(d)}
              >
                <Text style={[styles.segText, dayMode === d && styles.chipTextActive]}>
                  {t(`days.${d}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {dayMode === 'custom' && (
            <View style={styles.dayRow}>
              {weekdayLabels().map((label, idx) => {
                const on = selectedDays.includes(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.dayChip, on && styles.dayChipActive]}
                    onPress={() => setSelectedDays((prev) => toggle(prev, idx))}
                  >
                    <Text style={[styles.dayChipText, on && styles.dayChipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ─ Color ─ */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('form.color')}</Text>
          <View style={styles.colorRow}>
            {COLOR_TAGS.map((c: ColorTag) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorCircle, { backgroundColor: c }, color === c && styles.colorSelected]}
                onPress={() => setColor(c)}
              >
                {color === c && <Ionicons name="checkmark" size={18} color="#FFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─ Reminder offset ─ */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('form.offsetTitle')}</Text>
          <Text style={styles.label}>{t('form.offsetLabel')}</Text>
          <View style={styles.chipRow}>
            {OFFSETS.map((value) => (
              <Chip
                key={value}
                label={value === 0 ? t('form.offsetOnTime') : t('form.offsetBefore', { n: value })}
                active={notificationOffset === value}
                onPress={() => setNotificationOffset(value)}
              />
            ))}
          </View>
          {notificationOffset > 0 && (
            <Text style={styles.hint}>{t('form.offsetHint', { n: notificationOffset })}</Text>
          )}
        </View>

        {/* ─ Memo ─ */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('form.memo')}</Text>
          <TextInput
            style={[styles.input, styles.memoInput]}
            value={memo}
            onChangeText={setMemo}
            placeholder={t('form.memoPlaceholder')}
            placeholderTextColor={placeholderColor}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
        </View>

        {/* ─ Refill reminder ─ */}
        <View style={styles.card}>
          <View style={styles.prescHeader}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('form.prescription')}</Text>
            <TouchableOpacity
              style={[styles.toggle, hasPrescription && styles.toggleOn]}
              onPress={() => setHasPrescription(!hasPrescription)}
            >
              <Text style={[styles.toggleText, hasPrescription && styles.toggleTextOn]}>
                {hasPrescription ? t('form.on') : t('form.off')}
              </Text>
            </TouchableOpacity>
          </View>

          {hasPrescription && (
            <View style={{ marginTop: 14 }}>
              <Text style={styles.label}>{t('form.prescStart')}</Text>
              <TextInput
                style={styles.input}
                value={prescStartDate}
                onChangeText={(v) => setPrescStartDate(v.replace(/[^0-9-]/g, ''))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={placeholderColor}
                maxLength={10}
                keyboardType="numbers-and-punctuation"
              />
              <Text style={styles.label}>{t('form.prescDays')}</Text>
              <TextInput
                style={styles.input}
                value={prescDays}
                onChangeText={(v) => setPrescDays(v.replace(/[^0-9]/g, ''))}
                placeholder={t('form.prescDaysPlaceholder')}
                placeholderTextColor={placeholderColor}
                keyboardType="number-pad"
                maxLength={4}
              />
              <Text style={styles.label}>{t('form.prescAlert')}</Text>
              <View style={styles.chipRow}>
                {ALERT_DAYS.map((d) => {
                  const on = alertDays.includes(d);
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[styles.chip, on && styles.alertChipActive]}
                      onPress={() => setAlertDays((prev) => toggle(prev, d))}
                    >
                      <Text style={[styles.chipText, on && styles.alertChipTextActive]}>D-{d}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={20} color={colors.onBrand} />
          <Text style={styles.saveText}>{existing ? t('form.saveEdit') : t('form.saveNew')}</Text>
        </TouchableOpacity>

        {existing && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} accessibilityRole="button">
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteText}>{t('form.delete')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ThemeColors, scheme: Scheme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    scroll: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, paddingBottom: 48 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
      ...cardShadow(c, scheme),
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: c.brand, marginBottom: 14 },
    label: { fontSize: 14, fontWeight: '600', color: c.textMuted, marginBottom: 8 },
    input: {
      backgroundColor: c.inputBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: c.text,
      borderWidth: 1,
      borderColor: c.line,
      marginBottom: 14,
      minHeight: 48,
    },
    memoInput: { minHeight: 84, paddingTop: 12, marginBottom: 0 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: c.chipBorder,
      backgroundColor: c.inputBg,
    },
    chipActive: { borderColor: c.brand, backgroundColor: c.brandSoft },
    chipText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    chipTextActive: { color: c.brand },

    customDosage: { marginTop: 8 },
    customAmountInput: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
    unitRow: { marginBottom: 0 },

    freqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    freqChip: {
      minWidth: 48,
      flexGrow: 1,
      paddingVertical: 11,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.chipBorder,
      alignItems: 'center',
    },
    freqChipText: { fontSize: 14, color: c.textMuted, fontWeight: '600' },
    customFreqRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    customFreqInput: {
      width: 76,
      backgroundColor: c.inputBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.brand,
      paddingVertical: 10,
      fontSize: 16,
      fontWeight: '700',
      color: c.text,
      textAlign: 'center',
      minHeight: 46,
    },
    customFreqUnit: { fontSize: 14, color: c.textMuted, flex: 1 },
    applyBtn: { backgroundColor: c.brand, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
    applyText: { color: c.onBrand, fontSize: 13, fontWeight: '700' },

    timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
    timeInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.brandSoft,
      borderRadius: 12,
      paddingHorizontal: 14,
      minHeight: 50,
      borderWidth: 1,
      borderColor: c.brandBorder,
    },
    timeInput: { flex: 1, fontSize: 18, fontWeight: '700', color: c.brand, paddingVertical: 10 },
    timeAmPm: { fontSize: 14, fontWeight: '600', color: c.textMuted, marginLeft: 8 },
    removeTimeBtn: { padding: 4 },
    addTimeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    addTimeText: { color: c.brand, fontSize: 14, fontWeight: '600' },

    segRow: { flexDirection: 'row', gap: 8 },
    seg: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.chipBorder,
      alignItems: 'center',
    },
    segText: { fontSize: 14, color: c.textMuted, fontWeight: '600' },
    dayRow: { flexDirection: 'row', marginTop: 14, justifyContent: 'space-between' },
    dayChip: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: c.chipBorder,
      backgroundColor: c.inputBg,
    },
    dayChipActive: { backgroundColor: c.brand, borderColor: c.brand },
    dayChipText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
    dayChipTextActive: { color: c.onBrand },

    colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    colorCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    colorSelected: { transform: [{ scale: 1.15 }], borderWidth: 3, borderColor: c.surface },

    hint: { fontSize: 12, color: c.brand, marginTop: 6 },

    prescHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    toggle: { backgroundColor: c.surfaceMuted, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 6 },
    toggleOn: { backgroundColor: c.brand },
    toggleText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
    toggleTextOn: { color: c.onBrand },
    alertChipActive: { backgroundColor: c.warning, borderColor: c.warning },
    alertChipTextActive: { color: '#FFF' },

    saveBtn: {
      backgroundColor: c.brand,
      borderRadius: 16,
      paddingVertical: 17,
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    saveText: { color: c.onBrand, fontSize: 17, fontWeight: '700' },
    deleteBtn: {
      marginTop: 14,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: c.dangerSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    deleteText: { color: c.danger, fontSize: 15, fontWeight: '700' },
  });
