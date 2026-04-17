import { ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { Screen } from "../components/Screen";
import { useQuery } from "../hooks/useQuery";
import { session } from "../session";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function ClassesScreen() {
  const { status, data, error, refetch } = useQuery(
    () => api.listClasses(session.academyId),
    []
  );

  if (status !== "success") {
    return <Screen loading={status === "loading"} error={error} onRetry={refetch}>{null}</Screen>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {data.classes.length === 0 ? (
        <Text style={styles.empty}>등록된 반이 없습니다.</Text>
      ) : null}
      {data.classes.map((c) => {
        const days = [...new Set(c.schedules.map((s) => s.dayOfWeek))]
          .sort()
          .map((d) => DAY_LABELS[d])
          .join("/");
        const timeRange = c.schedules[0]
          ? `${formatTime(c.schedules[0].startTime)}~${formatTime(c.schedules[0].endTime)}`
          : "";
        return (
          <View key={c.id} style={styles.card}>
            <Text style={styles.name}>
              {c.name}
              {c.subject ? ` (${c.subject})` : ""}
            </Text>
            <Text style={styles.meta}>
              {days} {timeRange}
            </Text>
            <Text style={styles.meta}>학생 {c.enrollments.length}명</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  empty: { color: "#999", textAlign: "center", padding: 32 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
    gap: 4,
  },
  name: { fontSize: 16, fontWeight: "600" },
  meta: { color: "#666" },
});
