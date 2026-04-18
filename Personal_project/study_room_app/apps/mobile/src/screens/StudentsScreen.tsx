import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { Screen } from "../components/Screen";
import { StudentFormModal } from "../components/StudentFormModal";
import { useQuery } from "../hooks/useQuery";
import { session } from "../session";

export function StudentsScreen() {
  const [formOpen, setFormOpen] = useState(false);

  const { status, data, error, refetch } = useQuery(
    () => api.listStudents(session.academyId),
    []
  );

  if (status !== "success") {
    return <Screen loading={status === "loading"} error={error} onRetry={refetch}>{null}</Screen>;
  }

  const students = data.students;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={styles.list}
        data={students}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.count}>학생 {students.length}명</Text>
            <Pressable style={styles.addBtn} onPress={() => setFormOpen(true)}>
              <Text style={styles.addBtnText}>+ 등록</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>등록된 학생이 없습니다. 학생을 추가하세요.</Text>
        }
        renderItem={({ item }) => {
          const className = item.enrollments[0]?.classRoom.name ?? "미배정";
          return (
            <View style={styles.row}>
              <Text style={styles.name}>
                {item.name}
                {item.grade ? ` (${item.grade}학년)` : ""}
              </Text>
              <Text style={styles.meta}>
                월 {item.monthlyFee.toLocaleString("ko-KR")}원 · {className}
              </Text>
            </View>
          );
        }}
      />
      <StudentFormModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={refetch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
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
  row: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
  },
  name: { fontSize: 16, fontWeight: "600" },
  meta: { color: "#666", marginTop: 4 },
});
