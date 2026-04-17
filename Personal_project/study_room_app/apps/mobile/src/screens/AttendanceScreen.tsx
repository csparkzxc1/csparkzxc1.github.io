import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Status = "pending" | "checked_in" | "checked_out";
type Row = { id: string; name: string; status: Status; checkInAt?: string };

const INITIAL: Row[] = [
  { id: "1", name: "김민서", status: "pending" },
  { id: "2", name: "박지훈", status: "checked_in", checkInAt: "15:58" },
  { id: "3", name: "이수빈", status: "pending" },
  { id: "4", name: "최도윤", status: "checked_in", checkInAt: "16:02" },
];

export function AttendanceScreen() {
  const [rows, setRows] = useState(INITIAL);

  const toggle = (id: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (r.status === "pending") {
          const now = new Date();
          return {
            ...r,
            status: "checked_in",
            checkInAt: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
          };
        }
        if (r.status === "checked_in") return { ...r, status: "checked_out" };
        return r;
      })
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>초3 월수금 · 16:00~17:30</Text>
      <View style={styles.grid}>
        {rows.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => toggle(r.id)}
            style={[styles.card, cardStyleByStatus[r.status]]}
          >
            <Text style={styles.cardName}>{r.name}</Text>
            <Text style={styles.cardSub}>{labelByStatus(r)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function labelByStatus(r: Row): string {
  if (r.status === "pending") return "탭=등원";
  if (r.status === "checked_in") return `${r.checkInAt} 등원`;
  return "하원 완료";
}

const cardStyleByStatus: Record<Status, { backgroundColor: string }> = {
  pending: { backgroundColor: "#fff" },
  checked_in: { backgroundColor: "#dcf7e3" },
  checked_out: { backgroundColor: "#e6e6ea" },
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
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
});
