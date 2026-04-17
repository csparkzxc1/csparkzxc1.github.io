import { ScrollView, StyleSheet, Text, View } from "react-native";

export function TodayScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.date}>2026년 4월 17일 (금)</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>오늘 수업 현황</Text>
        <StatusRow label="등원 대기" value="8명" />
        <StatusRow label="수업 중" value="12명" />
        <StatusRow label="하원 완료" value="2명" />
        <StatusRow label="결석" value="0명" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>이번 달 요약</Text>
        <StatusRow label="예상 매출" value="2,640,000원" />
        <StatusRow label="미수금" value="320,000원 (2건)" />
        <StatusRow label="평균 출석률" value="94%" />
      </View>
    </ScrollView>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  date: { fontSize: 20, fontWeight: "600" },
  card: {
    backgroundColor: "#f5f5f7",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { color: "#555" },
  value: { fontWeight: "500" },
});
