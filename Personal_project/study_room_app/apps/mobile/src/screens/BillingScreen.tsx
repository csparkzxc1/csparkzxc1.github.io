import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { Screen } from "../components/Screen";
import { useQuery } from "../hooks/useQuery";
import { session } from "../session";

export function BillingScreen() {
  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [busy, setBusy] = useState<string | "generate" | null>(null);

  const { status, data, error, refetch } = useQuery(
    () => api.listInvoices(session.academyId, year, month),
    [year, month]
  );

  if (status !== "success") {
    return <Screen loading={status === "loading"} error={error} onRetry={refetch}>{null}</Screen>;
  }

  const invoices = data.invoices;
  const total = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const unpaid = invoices.filter((i) => i.status !== "paid");
  const unpaidTotal = unpaid.reduce((s, i) => s + i.totalAmount, 0);

  const handleGenerate = async () => {
    setBusy("generate");
    try {
      await api.generateInvoices(session.academyId, year, month);
      await refetch();
    } catch (err) {
      Alert.alert("정산서 생성 실패", (err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setBusy(id);
    try {
      await api.markInvoicePaid(id, "bank_transfer");
      await refetch();
    } catch (err) {
      Alert.alert("수납 처리 실패", (err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>
          {year}년 {month}월 요약
        </Text>
        <Row label="청구" value={`${total.toLocaleString("ko-KR")}원`} />
        <Row
          label="수납"
          value={`${(total - unpaidTotal).toLocaleString("ko-KR")}원`}
        />
        <Row
          label="미수금"
          value={`${unpaidTotal.toLocaleString("ko-KR")}원 (${unpaid.length}건)`}
        />
      </View>

      <Pressable
        style={styles.generateBtn}
        onPress={handleGenerate}
        disabled={busy === "generate"}
      >
        <Text style={styles.generateText}>
          {busy === "generate" ? "생성 중..." : "이번 달 정산서 생성·재계산"}
        </Text>
      </Pressable>

      {invoices.length === 0 ? (
        <Text style={styles.empty}>정산서가 없습니다. 위 버튼으로 생성하세요.</Text>
      ) : null}

      {invoices.map((i) => (
        <View key={i.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{i.student?.name ?? "학생"}</Text>
            <Text style={styles.amount}>
              {i.totalAmount.toLocaleString("ko-KR")}원
            </Text>
          </View>
          {i.status === "paid" ? (
            <Text style={styles.status}>수납 완료</Text>
          ) : (
            <Pressable
              style={styles.markBtn}
              onPress={() => handleMarkPaid(i.id)}
              disabled={busy === i.id}
            >
              <Text style={styles.markBtnText}>
                {busy === i.id ? "처리중" : "수납 처리"}
              </Text>
            </Pressable>
          )}
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
  generateBtn: {
    backgroundColor: "#1976d2",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 4,
  },
  generateText: { color: "#fff", fontWeight: "600" },
  empty: { color: "#999", textAlign: "center", padding: 24 },
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
  name: { fontSize: 16 },
  amount: { color: "#555", marginTop: 4 },
  status: { color: "#2e7d32", fontWeight: "500" },
  markBtn: {
    backgroundColor: "#fff3cd",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  markBtnText: { color: "#8a6d3b", fontWeight: "500" },
});
