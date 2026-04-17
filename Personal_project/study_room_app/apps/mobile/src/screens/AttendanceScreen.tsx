import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { Screen } from "../components/Screen";
import { useQuery } from "../hooks/useQuery";
import { session } from "../session";
import type { AttendanceRecord, Student } from "../api/types";

type RowStatus = "pending" | "checked_in" | "checked_out" | "absent";

interface Row {
  studentId: string;
  studentName: string;
  status: RowStatus;
  recordId?: string;
  checkInAt?: string;
}

export function AttendanceScreen() {
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const isoDate = today.toISOString();

  const studentsQuery = useQuery(() => api.listStudents(session.academyId), []);
  const attendanceQuery = useQuery(() => api.listAttendance(isoDate), [isoDate]);

  if (studentsQuery.status !== "success" || attendanceQuery.status !== "success") {
    return (
      <Screen
        loading={
          studentsQuery.status === "loading" || attendanceQuery.status === "loading"
        }
        error={studentsQuery.error ?? attendanceQuery.error}
        onRetry={() => {
          studentsQuery.refetch();
          attendanceQuery.refetch();
        }}
      >
        {null}
      </Screen>
    );
  }

  const rows = mergeRows(studentsQuery.data.students, attendanceQuery.data.records);

  const setRowBusy = (id: string, value: boolean) => {
    setBusy((prev) => {
      const next = new Set(prev);
      value ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const handleTap = async (row: Row) => {
    if (busy.has(row.studentId)) return;
    setRowBusy(row.studentId, true);
    try {
      if (row.status === "pending") {
        await api.checkIn({ studentId: row.studentId, recordedBy: session.teacherId });
      } else if (row.status === "checked_in" && row.recordId) {
        await api.checkOut(row.recordId);
      }
      await attendanceQuery.refetch();
    } catch (err) {
      Alert.alert("오류", (err as Error).message);
    } finally {
      setRowBusy(row.studentId, false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>
        {today.getFullYear()}-{String(today.getMonth() + 1).padStart(2, "0")}-
        {String(today.getDate()).padStart(2, "0")} 출결
      </Text>
      <View style={styles.grid}>
        {rows.map((r) => (
          <Pressable
            key={r.studentId}
            onPress={() => handleTap(r)}
            style={[styles.card, cardStyleByStatus[r.status]]}
          >
            <Text style={styles.cardName}>{r.studentName}</Text>
            <Text style={styles.cardSub}>
              {busy.has(r.studentId) ? "처리중..." : labelByStatus(r)}
            </Text>
          </Pressable>
        ))}
        {rows.length === 0 ? (
          <Text style={styles.empty}>학생을 먼저 등록하세요.</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

function mergeRows(students: Student[], records: AttendanceRecord[]): Row[] {
  const byStudent = new Map<string, AttendanceRecord>();
  for (const r of records) byStudent.set(r.studentId, r);

  return students.map((s) => {
    const rec = byStudent.get(s.id);
    if (!rec) {
      return { studentId: s.id, studentName: s.name, status: "pending" };
    }
    if (rec.status === "absent") {
      return { studentId: s.id, studentName: s.name, status: "absent", recordId: rec.id };
    }
    if (rec.checkOutAt) {
      return { studentId: s.id, studentName: s.name, status: "checked_out", recordId: rec.id };
    }
    return {
      studentId: s.id,
      studentName: s.name,
      status: "checked_in",
      recordId: rec.id,
      checkInAt: rec.checkInAt ?? undefined,
    };
  });
}

function labelByStatus(r: Row): string {
  if (r.status === "pending") return "탭=등원";
  if (r.status === "checked_in") return `${formatTime(r.checkInAt)} 등원`;
  if (r.status === "checked_out") return "하원 완료";
  return "결석";
}

function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const cardStyleByStatus: Record<RowStatus, { backgroundColor: string }> = {
  pending: { backgroundColor: "#fff" },
  checked_in: { backgroundColor: "#dcf7e3" },
  checked_out: { backgroundColor: "#e6e6ea" },
  absent: { backgroundColor: "#fde0e0" },
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  header: { fontSize: 16, fontWeight: "500" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "48%",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e6e6ea",
    minHeight: 80,
  },
  cardName: { fontSize: 16, fontWeight: "600" },
  cardSub: { color: "#555", marginTop: 6 },
  empty: { color: "#999", textAlign: "center", padding: 32, width: "100%" },
});
