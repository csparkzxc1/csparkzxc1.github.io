import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { AbsenceModal } from "../components/AbsenceModal";
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

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function AttendanceScreen() {
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [absenceTarget, setAbsenceTarget] = useState<{
    studentId: string;
    studentName: string;
  } | null>(null);

  const [viewDate, setViewDate] = useState<Date>(() => startOfDay(new Date()));
  const isoDate = viewDate.toISOString();
  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const ageInDays = daysBetween(todayStart, viewDate);
  const isToday = ageInDays === 0;
  const readOnly = ageInDays > 30 || viewDate > todayStart;

  const studentsQuery = useQuery(() => api.listStudents(session.academyId), []);
  const attendanceQuery = useQuery(
    () => api.listAttendance(isoDate),
    [isoDate]
  );

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

  const shiftDay = (delta: number) => {
    const next = new Date(viewDate);
    next.setDate(next.getDate() + delta);
    if (next > todayStart) return;
    setViewDate(startOfDay(next));
  };

  const handleTap = async (row: Row) => {
    if (readOnly || busy.has(row.studentId)) return;
    if (row.status === "absent" || row.status === "checked_out") return;
    if (!isToday) {
      Alert.alert(
        "과거 일자 체크인",
        "과거 일자에서는 새 체크인이 제한됩니다. 결석으로 처리하거나 기록을 수정하세요."
      );
      return;
    }
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

  const handleLongPress = (row: Row) => {
    if (readOnly || row.status === "checked_out") return;
    setAbsenceTarget({ studentId: row.studentId, studentName: row.studentName });
  };

  const dateLabel = formatDateHeader(viewDate);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.dateBar}>
        <Pressable
          hitSlop={8}
          onPress={() => shiftDay(-1)}
          disabled={ageInDays >= 30}
          style={styles.navBtn}
        >
          <Text style={[styles.navText, ageInDays >= 30 && styles.disabled]}>◀</Text>
        </Pressable>
        <View style={styles.dateCenter}>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
          {isToday ? null : (
            <Pressable onPress={() => setViewDate(todayStart)}>
              <Text style={styles.todayLink}>오늘로</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => shiftDay(1)}
          disabled={isToday}
          style={styles.navBtn}
        >
          <Text style={[styles.navText, isToday && styles.disabled]}>▶</Text>
        </Pressable>
      </View>

      {readOnly ? (
        <View style={styles.readonlyBanner}>
          <Text style={styles.readonlyText}>
            31일 이전 기록은 조회만 가능합니다
          </Text>
        </View>
      ) : (
        <Text style={styles.hint}>탭=등원/하원 · 길게 누르기=결석 처리</Text>
      )}

      <View style={styles.grid}>
        {rows.map((r) => (
          <Pressable
            key={r.studentId}
            onPress={() => handleTap(r)}
            onLongPress={() => handleLongPress(r)}
            delayLongPress={400}
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

      <AbsenceModal
        visible={absenceTarget !== null}
        studentId={absenceTarget?.studentId ?? null}
        studentName={absenceTarget?.studentName ?? null}
        onClose={() => setAbsenceTarget(null)}
        onSaved={() => attendanceQuery.refetch()}
      />
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

function formatDateHeader(d: Date): string {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} (${days[d.getDay()]})`;
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
  dateBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f7",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: "space-between",
  },
  navBtn: { paddingHorizontal: 14, paddingVertical: 4 },
  navText: { fontSize: 18, color: "#1976d2" },
  disabled: { color: "#bbb" },
  dateCenter: { alignItems: "center", gap: 2 },
  dateLabel: { fontSize: 16, fontWeight: "600" },
  todayLink: { fontSize: 12, color: "#1976d2" },
  hint: { fontSize: 12, color: "#888" },
  readonlyBanner: {
    backgroundColor: "#fff3cd",
    padding: 10,
    borderRadius: 8,
  },
  readonlyText: { color: "#8a6d3b", fontSize: 13, textAlign: "center" },
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
