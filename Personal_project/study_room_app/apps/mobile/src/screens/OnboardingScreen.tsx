import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../api/client";
import { installSession } from "../session";

interface Props {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: Props) {
  const [academyName, setAcademyName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!academyName.trim()) return Alert.alert("공부방 이름을 입력하세요");
    if (!teacherName.trim()) return Alert.alert("원장님 이름을 입력하세요");
    if (!/^010-?\d{4}-?\d{4}$/.test(teacherPhone)) {
      return Alert.alert("휴대폰 번호 형식을 확인하세요", "예: 010-1234-5678");
    }

    setSubmitting(true);
    try {
      const result = await api.setup({
        academyName: academyName.trim(),
        teacherName: teacherName.trim(),
        teacherPhone,
      });
      await installSession({
        academyId: result.academyId,
        teacherId: result.teacherId,
        academyName: result.academyName,
        teacherPhone,
      });
      onComplete();
    } catch (err) {
      Alert.alert("등록 실패", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.headline}>공부방 출결·정산</Text>
        <Text style={styles.subtitle}>
          원장님 정보를 입력해주세요. 1분이면 됩니다.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>공부방 이름</Text>
          <TextInput
            style={styles.input}
            value={academyName}
            onChangeText={setAcademyName}
            placeholder="민서영어공부방"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>원장님 이름</Text>
          <TextInput
            style={styles.input}
            value={teacherName}
            onChangeText={setTeacherName}
            placeholder="김선생"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>휴대폰 번호</Text>
          <TextInput
            style={styles.input}
            value={teacherPhone}
            onChangeText={setTeacherPhone}
            placeholder="010-1234-5678"
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <Text style={styles.help}>
            같은 번호로 다시 설치해도 이어쓸 수 있습니다.
          </Text>
        </View>

        <Pressable
          style={[styles.cta, submitting && styles.ctaDisabled]}
          onPress={submit}
          disabled={submitting}
        >
          <Text style={styles.ctaText}>
            {submitting ? "등록 중..." : "시작하기"}
          </Text>
        </Pressable>

        <Text style={styles.foot}>
          가입 후 학생 10명 등록까지 약 5분 소요됩니다.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16, paddingTop: 60 },
  headline: { fontSize: 26, fontWeight: "700" },
  subtitle: { fontSize: 15, color: "#666", marginBottom: 8 },
  field: { gap: 6 },
  label: { fontSize: 13, color: "#555" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  help: { fontSize: 12, color: "#888", marginTop: 4 },
  cta: {
    backgroundColor: "#1976d2",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  foot: { textAlign: "center", color: "#aaa", fontSize: 13, marginTop: 8 },
});
