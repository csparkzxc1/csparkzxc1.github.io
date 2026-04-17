import { ScrollView, StyleSheet, Text, View } from "react-native";

const MOCK_INVOICES = [
  { id: "1", name: "김민서", amount: 180000, status: "paid" },
  { id: "2", name: "박지훈", amount: 220000, status: "paid" },
  { id: "3", name: "이수빈", amount: 175000, status: "unpaid" },
  { id: "4", name: "최도윤", amount: 145000, status: "unpaid" },
];

export function BillingScreen() {
  const total = MOCK_INVOICES.reduce((sum, i) => sum + i.amount, 0);
  const unpaid = MOCK_INVOICES.filter((i) => i.status === "unpaid");
  const unpaidTotal = unpaid.reduce((sum, i) => sum + i.amount, 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>2026년 4월 요약</Text>
        <Row label="청구" value={`${total.toLocaleString()}원`} />
        <Row label="수납" value={`${(total - unpaidTotal).toLocaleString()}원`} />
        <Row label="미수금" value={`${unpaidTotal.toLocaleString()}원 (${unpaid.length}건)`} />
      </View>

      {MOCK_INVOICES.map((i) => (
        <View key={i.id} style={styles.row}>
          <Text style={styles.name}>{i.name}</Text>
          <Text style={styles.amount}>{i.amount.toLocaleString()}원</Text>
          <Text style={[styles.status, i.status === "unpaid" && styles.unpaid]}>
            {i.status === "paid" ? "수납 완료" : "미수"}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  summary: {
    backgroundColor: "#f5f5f7",
    borderRadius: 12,
    padding: 16,
    gap: 6,
    marginBottom: 8,
  },
  summaryTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryValue: { fontWeight: "500" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
  },
  name: { fontSize: 16, flex: 1 },
  amount: { marginRight: 12 },
  status: { fontSize: 13, color: "#2e7d32" },
  unpaid: { color: "#c62828" },
});
