import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import { RootStackParamList, Medicine, ColorTag, COLOR_TAGS } from '../types';
import { useMedicineStore } from '../store/medicineStore';
import { DAY_LABELS } from '../utils/dateUtils';

function generateId(): string {
  try {
    return uuidv4();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

type RouteParams = RouteProp<RootStackParamList, 'MedicineForm'>;

// ─── Constants ───────────────────────────────────────────────────────────────

const DOSAGE_CHIPS = ['0.5정', '1정', '1.5정', '2정', '3정', '5정', '10정'];

// [BUG 2] 1~6회 + 직접 입력
type FreqOption = '1' | '2' | '3' | '4' | '5' | '6' | 'custom';
type DayMode = 'everyday' | 'weekday' | 'weekend' | 'custom';

// 기본 시간 6개까지 준비
const DEFAULT_TIMES = ['08:00', '10:00', '13:00', '16:00', '19:00', '21:00'];

const NOTIFICATION_OFFSETS: { label: string; value: number }[] = [
  { label: '정시', value: 0 },
  { label: '5분 전', value: 5 },
  { label: '10분 전', value: 10 },
  { label: '15분 전', value: 15 },
  { label: '30분 전', value: 30 },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function normalizeTime(input: string): string {
  const clean = input.replace(/[^0-9:]/g, '');
  let h: number, m: number;
  if (clean.includes(':')) {
    const [hStr, mStr] = clean.split(':');
    h = parseInt(hStr, 10) || 0;
    m = parseInt(mStr, 10) || 0;
  } else if (clean.length >= 3) {
    const pivot = clean.length === 3 ? 1 : 2;
    h = parseInt(clean.slice(0, pivot), 10) || 0;
    m = parseInt(clean.slice(pivot), 10) || 0;
  } else {
    h = parseInt(clean, 10) || 0;
    m = 0;
  }
  h = Math.max(0, Math.min(23, h));
  m = Math.max(0, Math.min(59, m));
  return `${pad(h)}:${pad(m)}`;
}


// ─── Main Form ───────────────────────────────────────────────────────────────

export default function MedicineFormScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const medicineId = route.params?.medicineId;

  const { getMedicineById, addMedicine, updateMedicine } = useMedicineStore();
  const existing = medicineId ? getMedicineById(medicineId) : undefined;

  // ─── Form State ──────────────────────────────────────────────────────────

  const [name, setName] = useState(existing?.name ?? '');
  const [dosage, setDosage] = useState(existing?.dosage ?? '1정');
  const [dosageCustom, setDosageCustom] = useState(
    () => !DOSAGE_CHIPS.includes(existing?.dosage ?? '1정')
  );
  const [memo, setMemo] = useState(existing?.memo ?? '');
  const [color, setColor] = useState<ColorTag>(
    (existing?.color as ColorTag) ?? '#4A6CF7'
  );

  // [BUG 2] 1~6회 + 직접 입력
  const getInitialFreq = (): FreqOption => {
    const len = existing?.times.length ?? 1;
    if (len >= 1 && len <= 6) return String(len) as FreqOption;
    return 'custom';
  };
  const [freq, setFreq] = useState<FreqOption>(getInitialFreq());
  const [customFreqText, setCustomFreqText] = useState(
    freq === 'custom' ? String(existing?.times.length ?? '') : ''
  );
  const [times, setTimes] = useState<string[]>(
    existing?.times ?? [DEFAULT_TIMES[0]]
  );

  // Days
  const getDayMode = (): DayMode => {
    const d = existing?.days ?? 'everyday';
    if (d === 'everyday') return 'everyday';
    if (d === 'weekday') return 'weekday';
    if (d === 'weekend') return 'weekend';
    return 'custom';
  };
  const [dayMode, setDayMode] = useState<DayMode>(getDayMode());
  const [selectedDays, setSelectedDays] = useState<number[]>(
    Array.isArray(existing?.days) ? (existing.days as number[]) : [0, 1, 2, 3, 4, 5, 6]
  );

  // Notification offset
  const [notificationOffset, setNotificationOffset] = useState<number>(
    existing?.notificationOffset ?? 0
  );

  // Prescription
  const [hasPrescription, setHasPrescription] = useState(!!existing?.prescription);
  const [prescStartDate, setPrescStartDate] = useState(
    existing?.prescription?.startDate ?? format(new Date(), 'yyyy-MM-dd')
  );
  const [prescDays, setPrescDays] = useState(
    String(existing?.prescription?.totalDays ?? 30)
  );
  const [alertDays, setAlertDays] = useState<number[]>(
    existing?.prescription?.alertDays ?? [7]
  );

  // times 배열 길이를 freq에 맞춰 동기화
  useEffect(() => {
    if (freq === 'custom') return;
    const count = parseInt(freq, 10);
    if (times.length < count) {
      const next = [...times];
      while (next.length < count) {
        next.push(DEFAULT_TIMES[next.length] ?? '12:00');
      }
      setTimes(next);
    } else if (times.length > count) {
      setTimes(times.slice(0, count));
    }
  }, [freq]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  // [BUG 2] 직접 입력 횟수 적용
  const applyCustomFreq = () => {
    const n = parseInt(customFreqText, 10);
    if (isNaN(n) || n < 1 || n > 20) {
      Alert.alert('입력 오류', '복용 횟수는 1 ~ 20 사이로 입력해주세요.');
      return;
    }
    const next = [...times];
    while (next.length < n) next.push(DEFAULT_TIMES[next.length] ?? '12:00');
    setTimes(next.slice(0, n));
  };

  const toggleAlertDay = (day: number) => {
    setAlertDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleCustomDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addTime = () => setTimes((prev) => [...prev, '12:00']);

  const removeTime = (idx: number) => {
    if (times.length <= 1) return;
    setTimes((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('입력 오류', '약 이름을 입력해주세요.');
      return;
    }
    if (!dosage.trim()) {
      Alert.alert('입력 오류', '복용량을 입력해주세요.');
      return;
    }
    if (times.length === 0) {
      Alert.alert('입력 오류', '복용 시간을 하나 이상 설정해주세요.');
      return;
    }

    const days: Medicine['days'] =
      dayMode === 'everyday'
        ? 'everyday'
        : dayMode === 'weekday'
        ? 'weekday'
        : dayMode === 'weekend'
        ? 'weekend'
        : selectedDays.length > 0
        ? selectedDays.sort()
        : 'everyday';

    let prescription: Medicine['prescription'] = null;
    if (hasPrescription) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(prescStartDate) || isNaN(new Date(prescStartDate).getTime())) {
        Alert.alert('입력 오류', '처방 시작일을 올바른 형식으로 입력해주세요.\n예: 2024-01-15');
        return;
      }
      const totalDaysNum = parseInt(prescDays, 10);
      if (isNaN(totalDaysNum) || totalDaysNum < 1) {
        Alert.alert('입력 오류', '처방 일수를 올바르게 입력해주세요.');
        return;
      }
      prescription = { startDate: prescStartDate, totalDays: totalDaysNum, alertDays };
    }

    const medicine: Medicine = {
      id: existing?.id ?? generateId(),
      name: name.trim(),
      dosage: dosage.trim(),
      times,
      days,
      color,
      memo: memo.trim(),
      isActive: existing?.isActive ?? true,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      prescription,
      notificationOffset,
    };

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (existing) {
        await updateMedicine(medicine);
      } else {
        await addMedicine(medicine);
      }
      navigation.goBack();
    } catch {
      Alert.alert('오류', '저장 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─ 기본 정보 ─ */}
        <View style={styles.card}>
          <SectionTitle title="기본 정보" />

          <Text style={styles.label}>약 이름 *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="예: 타이레놀, 오메가-3"
            placeholderTextColor="#BBB"
            maxLength={40}
          />

          <Text style={styles.label}>1회 복용량 *</Text>

          {/* 복용량 칩 */}
          <View style={styles.dosageChipRow}>
            {DOSAGE_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip}
                style={[
                  styles.dosageChip,
                  dosage === chip && !dosageCustom && styles.dosageChipActive,
                ]}
                onPress={() => { setDosage(chip); setDosageCustom(false); }}
              >
                <Text style={[
                  styles.dosageChipText,
                  dosage === chip && !dosageCustom && styles.dosageChipTextActive,
                ]}>
                  {chip}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.dosageChip, dosageCustom && styles.dosageChipActive]}
              onPress={() => setDosageCustom(true)}
            >
              <Text style={[styles.dosageChipText, dosageCustom && styles.dosageChipTextActive]}>
                직접입력
              </Text>
            </TouchableOpacity>
          </View>

          {dosageCustom && (
            <TextInput
              style={styles.input}
              value={dosage}
              onChangeText={setDosage}
              placeholder="예: 2.5정, 500mg, 2캡슐"
              placeholderTextColor="#BBB"
              keyboardType="decimal-pad"
              maxLength={20}
              autoFocus
            />
          )}
        </View>

        {/* ─ 복용 횟수 / 시간 ─ */}
        <View style={styles.card}>
          <SectionTitle title="복용 시간" />

          {/* [BUG 2] 1~6회 chip + 직접 입력 */}
          <Text style={styles.label}>1일 복용 횟수 *</Text>
          <View style={styles.freqGrid}>
            {(['1', '2', '3', '4', '5', '6'] as FreqOption[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.freqChip, freq === f && styles.freqChipActive]}
                onPress={() => setFreq(f)}
              >
                <Text style={[styles.freqChipText, freq === f && styles.freqChipTextActive]}>
                  {f}회
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.freqChip, freq === 'custom' && styles.freqChipActive]}
              onPress={() => setFreq('custom')}
            >
              <Text style={[styles.freqChipText, freq === 'custom' && styles.freqChipTextActive]}>
                직접
              </Text>
            </TouchableOpacity>
          </View>

          {freq === 'custom' && (
            <View style={styles.customFreqRow}>
              <TextInput
                style={styles.customFreqInput}
                value={customFreqText}
                onChangeText={setCustomFreqText}
                placeholder="횟수 입력"
                placeholderTextColor="#BBB"
                keyboardType="numeric"
                maxLength={2}
                onBlur={applyCustomFreq}
                returnKeyType="done"
                onSubmitEditing={applyCustomFreq}
              />
              <Text style={styles.customFreqUnit}>회 (최대 20)</Text>
              <TouchableOpacity style={styles.customFreqApplyBtn} onPress={applyCustomFreq}>
                <Text style={styles.customFreqApplyText}>적용</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>복용 시간 설정 *</Text>
          {times.map((t, idx) => (
            <View key={idx} style={styles.timeRow}>
              <View style={styles.timeInputWrapper}>
                <Ionicons name="time-outline" size={18} color="#4A6CF7" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.timeInput}
                  value={t}
                  onChangeText={(v) => {
                    const next = [...times];
                    next[idx] = v;
                    setTimes(next);
                  }}
                  onBlur={() => {
                    const next = [...times];
                    next[idx] = normalizeTime(t);
                    next.sort();
                    setTimes(next);
                  }}
                  selectTextOnFocus
                  keyboardType="numbers-and-punctuation"
                  placeholder="08:30"
                  placeholderTextColor="#BBB"
                  maxLength={5}
                />
              </View>
              {times.length > 1 && (
                <TouchableOpacity
                  style={styles.removeTimeBtn}
                  onPress={() => removeTime(idx)}
                >
                  <Ionicons name="remove-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {freq === 'custom' && (
            <TouchableOpacity style={styles.addTimeBtn} onPress={addTime}>
              <Ionicons name="add-circle-outline" size={20} color="#4A6CF7" />
              <Text style={styles.addTimeBtnText}>시간 추가</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─ 복용 요일 ─ */}
        <View style={styles.card}>
          <SectionTitle title="복용 요일" />
          <View style={styles.segRow}>
            {(['everyday', 'weekday', 'weekend', 'custom'] as DayMode[]).map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.seg, dayMode === d && styles.segActive]}
                onPress={() => setDayMode(d)}
              >
                <Text style={[styles.segText, dayMode === d && styles.segTextActive]}>
                  {d === 'everyday' ? '매일' : d === 'weekday' ? '평일' : d === 'weekend' ? '주말' : '직접'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {dayMode === 'custom' && (
            <View style={styles.dayRow}>
              {DAY_LABELS.map((label, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.dayChip, selectedDays.includes(idx) && styles.dayChipActive]}
                  onPress={() => toggleCustomDay(idx)}
                >
                  <Text style={[styles.dayChipText, selectedDays.includes(idx) && styles.dayChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ─ 색상 태그 ─ */}
        <View style={styles.card}>
          <SectionTitle title="색상 태그" />
          <View style={styles.colorRow}>
            {COLOR_TAGS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorCircle, { backgroundColor: c }, color === c && styles.colorCircleSelected]}
                onPress={() => setColor(c)}
              >
                {color === c && <Ionicons name="checkmark" size={18} color="#FFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─ 알림 시간 조정 ─ */}
        <View style={styles.card}>
          <SectionTitle title="알림 시간 조정" />
          <Text style={styles.label}>복용 시간 기준 알림 시점</Text>
          <View style={styles.offsetRow}>
            {NOTIFICATION_OFFSETS.map(({ label, value }) => (
              <TouchableOpacity
                key={value}
                style={[styles.offsetChip, notificationOffset === value && styles.offsetChipActive]}
                onPress={() => setNotificationOffset(value)}
              >
                <Text style={[styles.offsetChipText, notificationOffset === value && styles.offsetChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {notificationOffset > 0 && (
            <Text style={styles.offsetHint}>복용 {notificationOffset}분 전에 알림을 드려요</Text>
          )}
        </View>

        {/* ─ 메모 ─ */}
        <View style={styles.card}>
          <SectionTitle title="메모 (선택)" />
          <TextInput
            style={[styles.input, styles.memoInput]}
            value={memo}
            onChangeText={setMemo}
            placeholder="복용 시 주의사항, 보관 방법 등"
            placeholderTextColor="#BBB"
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
        </View>

        {/* ─ 재처방 알림 ─ */}
        <View style={styles.card}>
          <View style={styles.prescRow}>
            <SectionTitle title="재처방 알림 (선택)" />
            <TouchableOpacity
              style={[styles.prescToggle, hasPrescription && styles.prescToggleOn]}
              onPress={() => setHasPrescription(!hasPrescription)}
            >
              <Text style={[styles.prescToggleText, hasPrescription && styles.prescToggleTextOn]}>
                {hasPrescription ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          {hasPrescription && (
            <>
              <Text style={styles.label}>처방 시작일</Text>
              <TextInput
                style={styles.input}
                value={prescStartDate}
                onChangeText={setPrescStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#BBB"
                maxLength={10}
                keyboardType="numeric"
              />
              <Text style={styles.label}>총 처방 일수</Text>
              <TextInput
                style={styles.input}
                value={prescDays}
                onChangeText={setPrescDays}
                placeholder="예: 30"
                placeholderTextColor="#BBB"
                keyboardType="numeric"
                maxLength={4}
              />
              <Text style={styles.label}>알림 시점 (복수 선택)</Text>
              <View style={styles.alertDayRow}>
                {[3, 5, 7, 14].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.alertDayChip, alertDays.includes(d) && styles.alertDayChipActive]}
                    onPress={() => toggleAlertDay(d)}
                  >
                    <Text style={[styles.alertDayChipText, alertDays.includes(d) && styles.alertDayChipTextActive]}>
                      D-{d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* ─ 저장 버튼 ─ */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Ionicons name="save-outline" size={20} color="#FFF" />
          <Text style={styles.saveBtnText}>{existing ? '수정 완료' : '약 등록하기'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F4F6FB' },
  content: { padding: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#3F4A7E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#4A6CF7', marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  input: {
    backgroundColor: '#F4F6FB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#222',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
    minHeight: 48,
  },
  memoInput: { minHeight: 80, paddingTop: 12 },

  // 복용량 칩 그리드
  dosageChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  dosagePresetScroll: { marginBottom: 10 },
  dosagePresetContent: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  dosageChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DDD',
    backgroundColor: '#F4F6FB',
  },
  dosageChipActive: { borderColor: '#4A6CF7', backgroundColor: '#EDF1FE' },
  dosageChipText: { fontSize: 13, fontWeight: '600', color: '#888' },
  dosageChipTextActive: { color: '#4A6CF7' },

  // [BUG 2] 복용 횟수
  freqGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  freqChip: {
    width: '13%',
    minWidth: 48,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DDD',
    alignItems: 'center',
    flexGrow: 1,
  },
  freqChipActive: { borderColor: '#4A6CF7', backgroundColor: '#EDF1FE' },
  freqChipText: { fontSize: 14, color: '#888', fontWeight: '600' },
  freqChipTextActive: { color: '#4A6CF7' },
  customFreqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  customFreqInput: {
    width: 72,
    backgroundColor: '#F4F6FB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4A6CF7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    minHeight: 44,
  },
  customFreqUnit: { fontSize: 14, color: '#888', flex: 1 },
  customFreqApplyBtn: {
    backgroundColor: '#4A6CF7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  customFreqApplyText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // Time row
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  timeInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F3FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#DCE3FD',
  },
  timeInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#4A6CF7',
    paddingVertical: 10,
  },
  removeTimeBtn: { padding: 4 },
  addTimeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  addTimeBtnText: { color: '#4A6CF7', fontSize: 14, fontWeight: '600' },

  // Day
  segRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  seg: {
    flex: 1,
    minWidth: 60,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  segActive: { borderColor: '#4A6CF7', backgroundColor: '#EDF1FE' },
  segText: { fontSize: 14, color: '#888', fontWeight: '600' },
  segTextActive: { color: '#4A6CF7' },
  dayRow: { flexDirection: 'row', marginTop: 14, gap: 8, flexWrap: 'wrap' },
  dayChip: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#DDD', backgroundColor: '#F4F6FB',
  },
  dayChipActive: { backgroundColor: '#4A6CF7', borderColor: '#4A6CF7' },
  dayChipText: { fontSize: 13, fontWeight: '700', color: '#888' },
  dayChipTextActive: { color: '#FFF' },

  // Color
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  colorCircleSelected: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
    transform: [{ scale: 1.15 }],
  },

  // Offset
  offsetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  offsetChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#DDD', backgroundColor: '#F4F6FB',
  },
  offsetChipActive: { borderColor: '#4A6CF7', backgroundColor: '#EDF1FE' },
  offsetChipText: { fontSize: 13, fontWeight: '600', color: '#888' },
  offsetChipTextActive: { color: '#4A6CF7' },
  offsetHint: { fontSize: 12, color: '#4A6CF7', marginTop: 4 },

  // Prescription
  prescRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  prescToggle: { backgroundColor: '#E9ECEF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 6 },
  prescToggleOn: { backgroundColor: '#4A6CF7' },
  prescToggleText: { fontSize: 13, fontWeight: '700', color: '#888' },
  prescToggleTextOn: { color: '#FFF' },
  alertDayRow: { flexDirection: 'row', gap: 10 },
  alertDayChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#DDD',
  },
  alertDayChipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  alertDayChipText: { fontSize: 14, fontWeight: '700', color: '#888' },
  alertDayChipTextActive: { color: '#FFF' },

  // Save
  saveBtn: {
    backgroundColor: '#4A6CF7', borderRadius: 16, paddingVertical: 17, marginTop: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#4A6CF7', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
