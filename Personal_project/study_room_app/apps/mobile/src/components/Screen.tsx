import { ReactNode } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

export function Screen(props: {
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  children: ReactNode;
  scroll?: boolean;
}) {
  if (props.loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (props.error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>불러오기 실패</Text>
        <Text style={styles.errorDetail}>{props.error.message}</Text>
        {props.onRetry ? <Text style={styles.retry} onPress={props.onRetry}>다시 시도</Text> : null}
      </View>
    );
  }
  if (props.scroll === false) {
    return <View style={styles.container}>{props.children}</View>;
  }
  return <ScrollView contentContainerStyle={styles.container}>{props.children}</ScrollView>;
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  error: { fontSize: 16, color: "#c62828", fontWeight: "600" },
  errorDetail: { color: "#555", textAlign: "center" },
  retry: { color: "#1976d2", marginTop: 8 },
});
