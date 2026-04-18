import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../api/client";
import { session } from "../session";

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function ClassFormModal({ visible, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("17:30");
  const [days, setDays] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setSubject("");
    setStartTime("16:00");
    setEndTime("17:30");
    setDays(new Set());
  };

  const toggleDay = (d: number) => {
    setDays((prev) => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  };

  const submit = async () => {
    if (!name.trim()) return Alert.alert("반 이름을 입력하세요");
    if (days.size === 0) return Alert.alert("요일을 1개 이상 선택하세요");
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return Alert.alert("시간 형식을 확인하세요", "예: 16:00");
    }

    setSubmitting(true);
    try {
      await api.createClass({
        academyId: session.academyId,
        name: name.trim(),
        subject: subject.trim() || undefined,
        schedules: [...days].sort().map((dayOfWeek) => ({
          dayOfWeek,
          startTime,
          endTime,
        })),
      });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      Alert.alert("등록 실패", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} disabled={submitting}>
            <Text style={styles.cancel}>취소</Text>
          </Pressable>
          <Text style={styles.title}>반 등록</Text>
          <Pressable onPress={submit} disabled={submitting}>
            <Text style={[styles.save, submitting && styles.disabled]}>
              {submitting ? "저장중" : "저장"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Field label="반 이름 *" value={name} onChangeText={setName} placeholder="초3 월수금" />
          <Field
            label="과목"
            value={subject}
            onChangeText={setSubject}
            placeholder="영어"
          />

          <Text style={styles.label}>요일 *</Text>
          <View style={styles.dayRow}>
            {DAY_LABELS.map((label, d) => {
              const active = days.has(d);
              return (
                <Pressable
                  key={d}
                  onPress={() => toggleDay(d)}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                >
                  <Text style={[styles.dayText, active && styles.dayTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Field
                label="시작 시간"
                value={startTime}
                onChangeText={setStartTime}
                placeholder="16:00"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="종료 시간"
                value={endTime}
                onChangeText={setEndTime}
                placeholder="17:30"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  title: { fontSize: 16, fontWeight: "600" },
  cancel: { color: "#888", fontSize: 15 },
  save: { color: "#1976d2", fontSize: 15, fontWeight: "600" },
  disabled: { opacity: 0.4 },
  body: { padding: 16, gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 13, color: "#555" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  dayRow: { flexDirection: "row", gap: 8 },
  dayChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  dayChipActive: { backgroundColor: "#1976d2", borderColor: "#1976d2" },
  dayText: { color: "#555" },
  dayTextActive: { color: "#fff", fontWeight: "600" },
  timeRow: { flexDirection: "row", gap: 10 },
});
