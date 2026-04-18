import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../api/client";
import { Screen } from "../components/Screen";
import { clearSession, installSession, session } from "../session";

interface Props {
  onClose: () => void;
  onSignedOut: () => void;
}

export function SettingsScreen({ onClose, onSignedOut }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [academyName, setAcademyName] = useState(session.academyName);
  const [freeCount, setFreeCount] = useState("0");
  const [deduction, setDeduction] = useState("0");
  const [siblingPercent, setSiblingPercent] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { rule } = await api.getBillingRule(session.academyId);
        setFreeCount(String(rule.absenceFreeCount));
        setDeduction(String(rule.absenceDeductionPerClass));
        setSiblingPercent(String(Math.round(rule.siblingDiscountRate * 100)));
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || error) {
    return <Screen loading={loading} error={error} onRetry={() => setLoading(true)}>{null}</Screen>;
  }

  const save = async () => {
    const free = Number(freeCount);
    const ded = Number(deduction);
    const pct = Number(siblingPercent);
    if (!Number.isInteger(free) || free < 0 || free > 10) {
      return Alert.alert("결석 무료 횟수는 0~10 사이 정수여야 합니다");
    }
    if (!Number.isInteger(ded) || ded < 0 || ded > 100_000) {
      return Alert.alert("회당 차감액은 0~100,000원 사이여야 합니다");
    }
    if (!Number.isFinite(pct) || pct < 0 || pct > 50) {
      return Alert.alert("형제 할인은 0~50% 사이여야 합니다");
    }
    if (!academyName.trim()) return Alert.alert("공부방 이름을 입력하세요");

    setSaving(true);
    try {
      await api.updateBillingRule(session.academyId, {
        absenceFreeCount: free,
        absenceDeductionPerClass: ded,
        siblingDiscountRate: pct / 100,
      });
      if (academyName.trim() !== session.academyName) {
        const updated = await api.updateAcademyName(session.academyId, academyName.trim());
        await installSession({ ...session, academyName: updated.academy.name });
      }
      Alert.alert("저장 완료");
      onClose();
    } catch (err) {
      Alert.alert("저장 실패", (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const signOut = () => {
    Alert.alert("로그아웃 하시겠습니까?", "이 기기에서 원장님 계정이 삭제됩니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          await clearSession();
          onSignedOut();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <Pressable onPress={onClose} disabled={saving}>
          <Text style={styles.cancel}>닫기</Text>
        </Pressable>
        <Text style={styles.title}>설정</Text>
        <Pressable onPress={save} disabled={saving}>
          <Text style={[styles.save, saving && styles.disabled]}>
            {saving ? "저장중" : "저장"}
          </Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Section title="공부방 정보">
          <Field label="공부방 이름" value={academyName} onChangeText={setAcademyName} />
          <Text style={styles.readonly}>원장 {session.teacherPhone}</Text>
        </Section>

        <Section title="정산 규칙">
          <Field
            label="결석 무료 횟수 (월)"
            value={freeCount}
            onChangeText={setFreeCount}
            keyboardType="number-pad"
            help="이 횟수를 초과한 결석부터 차감됩니다"
          />
          <Field
            label="초과 결석 회당 차감액 (원)"
            value={deduction}
            onChangeText={setDeduction}
            keyboardType="number-pad"
          />
          <Field
            label="형제 할인 (%)"
            value={siblingPercent}
            onChangeText={setSiblingPercent}
            keyboardType="number-pad"
            help="같은 가족 내 두 번째 학생부터 적용"
          />
        </Section>

        <Pressable style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>로그아웃</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{props.title}</Text>
      {props.children}
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "number-pad";
  help?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        keyboardType={props.keyboardType}
      />
      {props.help ? <Text style={styles.help}>{props.help}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  body: { padding: 16, gap: 20 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 13, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  field: { gap: 6 },
  label: { fontSize: 14, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  help: { fontSize: 12, color: "#888" },
  readonly: { fontSize: 14, color: "#888", paddingVertical: 4 },
  signOut: {
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#fce4ec",
    alignItems: "center",
  },
  signOutText: { color: "#c62828", fontWeight: "600" },
});
