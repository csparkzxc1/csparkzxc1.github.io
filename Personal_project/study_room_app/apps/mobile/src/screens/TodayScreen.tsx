import { StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { Screen } from "../components/Screen";
import { useQuery } from "../hooks/useQuery";
import { session } from "../session";

export function TodayScreen() {
  const { status, data, error, refetch } = useQuery(() => api.today(session.academyId), []);

  const today = new Date();
  const dateLabel = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  return (
    <Screen loading={status === "loading"} error={error} onRetry={refetch}>
      <Text style={styles.date}>{dateLabel}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>오늘 수업 현황</Text>
        <Row label="등원 대기" value={`${data?.today.waiting ?? 0}명`} />
        <Row label="수업 중" value={`${data?.today.checkedIn ?? 0}명`} />
        <Row label="하원 완료" value={`${data?.today.checkedOut ?? 0}명`} />
        <Row label="결석" value={`${data?.today.absent ?? 0}명`} />
      </View>

      {data?.classProgress.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>반별 등원</Text>
          {data.classProgress.map((c) => (
            <Row
              key={c.id}
              label={c.name}
              value={`${c.presentCount}/${c.totalCount} 등원`}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>이번 달 요약</Text>
        <Row
          label="예상 매출"
          value={`${(data?.month.expectedRevenue ?? 0).toLocaleString("ko-KR")}원`}
        />
        <Row
          label="미수금"
          value={
            data
              ? `${data.month.unpaidAmount.toLocaleString("ko-KR")}원 (${data.month.unpaidCount}건)`
              : "0원"
          }
        />
        <Row
          label="평균 출석률"
          value={
            data?.month.attendanceRate !== null && data?.month.attendanceRate !== undefined
              ? `${Math.round(data.month.attendanceRate * 100)}%`
              : "—"
          }
        />
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
