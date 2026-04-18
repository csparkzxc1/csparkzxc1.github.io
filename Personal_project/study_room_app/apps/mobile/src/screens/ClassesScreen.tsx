import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { ClassFormModal, type ClassFormInitial } from "../components/ClassFormModal";
import { Screen } from "../components/Screen";
import { useQuery } from "../hooks/useQuery";
import { session } from "../session";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function ClassesScreen() {
  const [editing, setEditing] = useState<ClassFormInitial | "new" | null>(null);
  const { status, data, error, refetch } = useQuery(
    () => api.listClasses(session.academyId),
    []
  );

  if (status !== "success") {
    return <Screen loading={status === "loading"} error={error} onRetry={refetch}>{null}</Screen>;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.count}>반 {data.classes.length}개</Text>
          <Pressable style={styles.addBtn} onPress={() => setEditing("new")}>
            <Text style={styles.addBtnText}>+ 반</Text>
          </Pressable>
        </View>

        {data.classes.length === 0 ? (
          <Text style={styles.empty}>등록된 반이 없습니다.</Text>
        ) : null}

        {data.classes.map((c) => {
          const days = [...new Set(c.schedules.map((s) => s.dayOfWeek))].sort();
          const daysLabel = days.map((d) => DAY_LABELS[d]).join("/");
          const first = c.schedules[0];
          const startTime = first ? formatTime(first.startTime) : "16:00";
          const endTime = first ? formatTime(first.endTime) : "17:30";
          const timeRange = `${startTime}~${endTime}`;
          return (
            <Pressable
              key={c.id}
              style={styles.card}
              onPress={() =>
                setEditing({
                  id: c.id,
                  name: c.name,
                  subject: c.subject,
                  days,
                  startTime,
                  endTime,
                })
              }
            >
              <Text style={styles.name}>
                {c.name}
                {c.subject ? ` (${c.subject})` : ""}
              </Text>
              <Text style={styles.meta}>
                {daysLabel} {timeRange}
              </Text>
              <Text style={styles.meta}>학생 {c.enrollments.length}명</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ClassFormModal
        visible={editing !== null}
        initial={editing && editing !== "new" ? editing : undefined}
        onClose={() => setEditing(null)}
        onSaved={refetch}
      />
    </View>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  count: { fontSize: 14, color: "#666" },
  addBtn: {
    backgroundColor: "#1976d2",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "500" },
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
