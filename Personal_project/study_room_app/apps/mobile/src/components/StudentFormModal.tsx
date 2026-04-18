import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../api/client";
import { session } from "../session";

export interface StudentFormInitial {
  id: string;
  name: string;
  grade?: number | null;
  monthlyFee: number;
  guardianPhone?: string;
}

interface Props {
  visible: boolean;
  initial?: StudentFormInitial;
  onClose: () => void;
  onSaved: () => void;
}

export function StudentFormModal({ visible, initial, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(initial);

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setName(initial.name);
      setGrade(initial.grade ? String(initial.grade) : "");
      setMonthlyFee(String(initial.monthlyFee));
      setGuardianPhone(initial.guardianPhone ?? "");
    } else {
      setName("");
      setGrade("");
      setMonthlyFee("");
      setGuardianPhone("");
    }
  }, [visible, initial]);

  const submit = async () => {
    if (!name.trim()) return Alert.alert("이름을 입력하세요");
    const fee = Number(monthlyFee.replace(/[^0-9]/g, ""));
    if (!fee || fee < 1000) return Alert.alert("월 수강료를 확인하세요");

    setSubmitting(true);
    try {
      if (isEdit && initial) {
        await api.updateStudent(initial.id, {
          name: name.trim(),
          grade: grade ? Number(grade) : null,
          monthlyFee: fee,
        });
      } else {
        if (!/^010-?\d{4}-?\d{4}$/.test(guardianPhone)) {
          setSubmitting(false);
          return Alert.alert("학부모 전화번호 형식을 확인하세요", "예: 010-1234-5678");
        }
        await api.createStudent({
          academyId: session.academyId,
          name: name.trim(),
          grade: grade ? Number(grade) : undefined,
          monthlyFee: fee,
          enrolledAt: new Date().toISOString().slice(0, 10),
          guardians: [{ phone: guardianPhone, isPrimary: true, relation: "mother" }],
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert("저장 실패", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = () => {
    if (!initial) return;
    Alert.alert(
      `${initial.name} 학생 삭제`,
      "퇴원 처리됩니다. 정산·출결 기록은 유지되며 학생은 목록에서 사라집니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              await api.deleteStudent(initial.id);
              onSaved();
              onClose();
            } catch (err) {
              Alert.alert("삭제 실패", (err as Error).message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} disabled={submitting}>
            <Text style={styles.cancel}>취소</Text>
          </Pressable>
          <Text style={styles.title}>{isEdit ? "학생 수정" : "학생 등록"}</Text>
          <Pressable onPress={submit} disabled={submitting}>
            <Text style={[styles.save, submitting && styles.disabled]}>
              {submitting ? "저장중" : "저장"}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Field label="이름 *" value={name} onChangeText={setName} placeholder="홍길동" />
          <Field
            label="학년"
            value={grade}
            onChangeText={setGrade}
            placeholder="3"
            keyboardType="number-pad"
          />
          <Field
            label="월 수강료 * (원)"
            value={monthlyFee}
            onChangeText={setMonthlyFee}
            placeholder="180000"
            keyboardType="number-pad"
          />
          {isEdit ? null : (
            <Field
              label="학부모 연락처 *"
              value={guardianPhone}
              onChangeText={setGuardianPhone}
              placeholder="010-1234-5678"
              keyboardType="phone-pad"
            />
          )}

          {isEdit ? (
            <Pressable style={styles.deleteBtn} onPress={confirmDelete} disabled={submitting}>
              <Text style={styles.deleteText}>이 학생 퇴원 처리</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "number-pad" | "phone-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        keyboardType={props.keyboardType}
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
  deleteBtn: {
    marginTop: 24,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#fce4ec",
    alignItems: "center",
  },
  deleteText: { color: "#c62828", fontWeight: "600" },
});
