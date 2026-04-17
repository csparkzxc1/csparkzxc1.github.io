import { FlatList, StyleSheet, Text, View } from "react-native";

const MOCK = [
  { id: "1", name: "김민서", grade: 3, monthlyFee: 180000, attendance: "96%" },
  { id: "2", name: "박지훈", grade: 5, monthlyFee: 220000, attendance: "88%" },
  { id: "3", name: "이수빈", grade: 3, monthlyFee: 175000, attendance: "92%" },
];

export function StudentsScreen() {
  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={MOCK}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.name}>
            {item.name} ({item.grade}학년)
          </Text>
          <Text style={styles.meta}>
            월 {item.monthlyFee.toLocaleString()}원 · 출석 {item.attendance}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
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
