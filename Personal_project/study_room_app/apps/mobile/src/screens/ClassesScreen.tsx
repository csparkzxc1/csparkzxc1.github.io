import { StyleSheet, Text, View } from "react-native";

export function ClassesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>반 관리</Text>
      <Text style={styles.placeholder}>
        WIREFRAMES.md §4 참고. 반 목록/시간표 편집 UI 연결 예정.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  title: { fontSize: 18, fontWeight: "600" },
  placeholder: { color: "#666" },
});
