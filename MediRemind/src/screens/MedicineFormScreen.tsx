import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
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

// uuid shim – expo provides crypto via expo-crypto; use simple fallback
function generateId(): string {
  try {
    return uuidv4();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

type RouteParams = RouteProp<RootStackParamList, 'MedicineForm'>;

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function TimePickerModal({
  visible,
  initialTime,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  initialTime: string;
  onConfirm: (time: string) => void;
  onClose: () => void;
}) {
  const [hour, setHour] = useState(parseInt(initialTime.split(':')[0], 10));
  const [minute, setMinute] = useState(parseInt(initialTime.split(':')[1], 10));

  const fmt = (n: number, pad = 2) => String(n).padStart(pad, '0');

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={tpStyles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={tpStyles.sheet}>
          <Text style={tpStyles.title}>복용 시간 설정</Text>
          <View style={tpStyles.pickers}>
            {/* Hour */}
            <View style={tpStyles.pickerCol}>
              <TouchableOpacity onPress={() => setHour((h) => (h + 1) % 24)}>
                <Ionicons name="chevron-up" size={24} color="#4A90D9" />
              </TouchableOpacity>
              <Text style={tpStyles.pickerValue}>{fmt(hour)}</Text>
              <TouchableOpacity onPress={() => setHour((h) => (h - 1 + 24) % 24)}>
                <Ionicons name="chevron-down" size={24} color="#4A90D9" />
              </TouchableOpacity>
            </View>
            <Text style={tpStyles.colon}>:</Text>
            {/* Minute */}
            <View style={tpStyles.pickerCol}>
              <TouchableOpacity onPress={() => setMinute((m) => (m + 5) % 60)}>
                <Ionicons name="chevron-up" size={24} color="#4A90D9" />
              </TouchableOpacity>
              <Text style={tpStyles.pickerValue}>{fmt(minute)}</Text>
              <TouchableOpacity onPress={() => setMinute((m) => (m - 5 + 60) % 60)}>
                <Ionicons name="chevron-down" size={24} color="#4A90D9" />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={tpStyles.confirmBtn}
            onPress={() => onConfirm(`${fmt(hour)}:${fmt(minute)}`)}
          >
            <Text style={tpStyles.confirmText}>확인</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const tpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 24,
  },
  pickers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  pickerCol: {
    alignItems: 'center',
    gap: 12,
  },
  pickerValue: {
    fontSize: 44,
    fontWeight: '700',
    color: '#222',
    width: 72,
    textAlign: 'center',
  },
  colon: {
    fontSize: 36,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  confirmBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  confirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

// ─── Main Form ───────────────────────────────────────────────────────────────

type FreqOption = '1' | '2' | '3' | 'custom';
type DayMode = 'everyday' | 'weekday' | 'weekend' | 'custom';

const DEFAULT_TIMES = ['08:00', '13:00', '21:00'];

const NOTIFICATION_OFFSETS: { label: string; value: number }[] = [
  { label: '정시', value: 0 },
  { label: '5분 전', value: 5 },
  { label: '10분 전', value: 10 },
  { label: '15분 전', value: 15 },
  { label: '30분 전', value: 30 },
];

export default function MedicineFormScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const medicineId = route.params?.medicineId;

  const { getMedicineById, addMedicine, updateMedicine } = useMedicineStore();
  const existing = medicineId ? getMedicineById(medicineId) : undefined;

  // ─── Form State ──────────────────────────────────────────────────────────

  const [name, setName] = useState(existing?.name ?? '');
  const [dosage, setDosage] = useState(existing?.dosage ?? '1정');
  const [memo, setMemo] = useState(existing?.memo ?? '');
  const [color, setColor] = useState<ColorTag>(
    (existing?.color as ColorTag) ?? '#4A90D9'
  );

  // Frequency
  const getInitialFreq = (): FreqOption => {
    const len = existing?.times.length ?? 1;
    if (len === 1) return '1';
    if (len === 2) return '2';
    if (len === 3) return '3';
    return 'custom';
  };
  const [freq, setFreq] = useState<FreqOption>(getInitialFreq());
  const [times, setTimes] = useState<string[]>(
    existing?.times ?? [DEFAULT_TIMES[0]]
  );
  const [timePickerIdx, setTimePickerIdx] = useState<number | null>(null);

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

  // Sync times array length with freq selection
  useEffect(() => {
    const count = freq === 'custom' ? times.length : parseInt(freq, 10);
    if (times.length < count) {
      const newTimes = [...times];
      while (newTimes.length < count) {
        newTimes.push(DEFAULT_TIMES[newTimes.length] ?? '12:00');
      }
      setTimes(newTimes);
    } else if (times.length > count && freq !== 'custom') {
      setTimes(times.slice(0, count));
    }
  }, [freq]);

  // ─── Validation & Save ───────────────────────────────────────────────────

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
      const totalDaysNum = parseInt(prescDays, 10);
      if (isNaN(totalDaysNum) || totalDaysNum < 1) {
        Alert.alert('입력 오류', '처방 일수를 올바르게 입력해주세요.');
        return;
      }
      prescription = {
        startDate: prescStartDate,
        totalDays: totalDaysNum,
        alertDays,
      };
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
    } catch (error) {
      Alert.alert('오류', '저장 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
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

  const addTime = () => {
    setTimes((prev) => [...prev, '12:00']);
  };

  const removeTime = (idx: number) => {
    if (times.length <= 1) return;
    setTimes((prev) => prev.filter((_, i) => i !== idx));
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
          <TextInput
            style={styles.input}
            value={dosage}
            onChangeText={setDosage}
            placeholder="예: 1정, 2정, 0.5정, 500mg"
            placeholderTextColor="#BBB"
            maxLength={20}
          />
        </View>

        {/* ─ 복용 횟수 / 시간 ─ */}
        <View style={styles.card}>
          <SectionTitle title="복용 시간" />

          <Text style={styles.label}>1일 복용 횟수 *</Text>
          <View style={styles.segRow}>
            {(['1', '2', '3', 'custom'] as FreqOption[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.seg, freq === f && styles.segActive]}
                onPress={() => setFreq(f)}
              >
                <Text style={[styles.segText, freq === f && styles.segTextActive]}>
                  {f === 'custom' ? '직접' : `${f}회`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>복용 시간 설정 *</Text>
          {times.map((t, idx) => (
            <View key={idx} style={styles.timeRow}>
              <TouchableOpacity
                style={styles.timeBtn}
                onPress={() => setTimePickerIdx(idx)}
              >
                <Ionicons name="time-outline" size={18} color="#4A90D9" />
                <Text style={styles.timeText}>{t}</Text>
              </TouchableOpacity>
              {(freq === 'custom' || times.length > 1) && (
                <TouchableOpacity
                  style={styles.removeTimeBtn}
                  onPress={() => removeTime(idx)}
                >
                  <Ionicons name="remove-circle" size={22} color="#D9534F" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {freq === 'custom' && (
            <TouchableOpacity style={styles.addTimeBtn} onPress={addTime}>
              <Ionicons name="add-circle-outline" size={20} color="#4A90D9" />
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
                  {d === 'everyday'
                    ? '매일'
                    : d === 'weekday'
                    ? '평일'
                    : d === 'weekend'
                    ? '주말'
                    : '직접'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {dayMode === 'custom' && (
            <View style={styles.dayRow}>
              {DAY_LABELS.map((label, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayChip,
                    selectedDays.includes(idx) && styles.dayChipActive,
                  ]}
                  onPress={() => toggleCustomDay(idx)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      selectedDays.includes(idx) && styles.dayChipTextActive,
                    ]}
                  >
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
                style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  color === c && styles.colorCircleSelected,
                ]}
                onPress={() => setColor(c)}
              >
                {color === c && (
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                )}
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
            <Text style={styles.offsetHint}>
              복용 {notificationOffset}분 전에 알림을 드려요
            </Text>
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
              style={[
                styles.prescToggle,
                hasPrescription && styles.prescToggleOn,
              ]}
              onPress={() => setHasPrescription(!hasPrescription)}
            >
              <Text
                style={[
                  styles.prescToggleText,
                  hasPrescription && styles.prescToggleTextOn,
                ]}
              >
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
                {[3, 5, 7].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.alertDayChip,
                      alertDays.includes(d) && styles.alertDayChipActive,
                    ]}
                    onPress={() => toggleAlertDay(d)}
                  >
                    <Text
                      style={[
                        styles.alertDayChipText,
                        alertDays.includes(d) && styles.alertDayChipTextActive,
                      ]}
                    >
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
          <Text style={styles.saveBtnText}>
            {existing ? '수정 완료' : '약 등록하기'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Time Picker Modal */}
      {timePickerIdx !== null && (
        <TimePickerModal
          visible
          initialTime={times[timePickerIdx] ?? '08:00'}
          onConfirm={(t) => {
            const newTimes = [...times];
            newTimes[timePickerIdx] = t;
            setTimes(newTimes);
            setTimePickerIdx(null);
          }}
          onClose={() => setTimePickerIdx(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A90D9',
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
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
  memoInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  segRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
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
  segActive: {
    borderColor: '#4A90D9',
    backgroundColor: '#EEF5FB',
  },
  segText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },
  segTextActive: {
    color: '#4A90D9',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  timeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D0E8FF',
  },
  timeText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4A90D9',
  },
  removeTimeBtn: {
    padding: 4,
  },
  addTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  addTimeBtnText: {
    color: '#4A90D9',
    fontSize: 14,
    fontWeight: '600',
  },
  dayRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
    flexWrap: 'wrap',
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#DDD',
    backgroundColor: '#F8F9FA',
  },
  dayChipActive: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
  },
  dayChipTextActive: {
    color: '#FFF',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ scale: 1.15 }],
  },
  prescRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  prescToggle: {
    backgroundColor: '#E9ECEF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  prescToggleOn: {
    backgroundColor: '#4A90D9',
  },
  prescToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
  },
  prescToggleTextOn: {
    color: '#FFF',
  },
  alertDayRow: {
    flexDirection: 'row',
    gap: 10,
  },
  alertDayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DDD',
  },
  alertDayChipActive: {
    backgroundColor: '#F0AD4E',
    borderColor: '#F0AD4E',
  },
  alertDayChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
  },
  alertDayChipTextActive: {
    color: '#FFF',
  },
  offsetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  offsetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DDD',
    backgroundColor: '#F8F9FA',
  },
  offsetChipActive: {
    borderColor: '#4A90D9',
    backgroundColor: '#EEF5FB',
  },
  offsetChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  offsetChipTextActive: {
    color: '#4A90D9',
  },
  offsetHint: {
    fontSize: 12,
    color: '#4A90D9',
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#4A90D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
