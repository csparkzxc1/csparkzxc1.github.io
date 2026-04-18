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

type Reason = "personal" | "sick" | "no_contact" | "other";
const REASONS: Array<{ code: Reason; label: string }> = [
  { code: "personal", label: "개인사정" },
  { code: "sick", label: "병결" },
  { code: "no_contact", label: "통보없음" },
  { code: "other", label: "기타" },
];

interface Props {
  visible: boolean;
  studentId: string | null;
  studentName: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AbsenceModal({ visible, studentId, studentName, onClose, onSaved }: Props) {
  const [reason, setReason] = useState<Reason>("sick");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason("sick");
    setNote("");
  };

  const submit = async () => {
    if (!studentId) return;
    setSubmitting(true);
    try {
      await api.markAbsent({
        studentId,
        date: new Date().toISOString(),
        recordedBy: session.teacherId,
        absenceReason: reason,
        absenceNote: note.trim() || undefined,
      });
      reset();
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert("결석 처리 실패", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>
            {studentName ? `${studentName} 결석 처리` : "결석 처리"}
          </Text>

          <Text style={styles.label}>사유 *</Text>
          {REASONS.map((r) => {
            const selected = r.code === reason;
            return (
              <Pressable
                key={r.code}
                onPress={() => setReason(r.code)}
                style={styles.radioRow}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={styles.radioLabel}>{r.label}</Text>
              </Pressable>
            );
          })}

          <Text style={styles.label}>메모</Text>
          <TextInput
            style={styles.textarea}
            value={note}
            onChangeText={setNote}
            placeholder="예: 감기로 오늘 쉽니다 (엄마)"
            multiline
            numberOfLines={3}
          />

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.btn} disabled={submitting}>
              <Text style={styles.btnText}>취소</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              style={[styles.btn, styles.primaryBtn]}
              disabled={submitting}
            >
              <Text style={[styles.btnText, styles.primaryBtnText]}>
                {submitting ? "처리중" : "확인"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    gap: 10,
  },
  title: { fontSize: 17, fontWeight: "600", marginBottom: 4 },
  label: { fontSize: 13, color: "#555", marginTop: 6 },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#aaa",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: "#1976d2" },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1976d2",
  },
  radioLabel: { fontSize: 15 },
  textarea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    minHeight: 64,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  primaryBtn: { backgroundColor: "#1976d2" },
  btnText: { fontSize: 15 },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
});
