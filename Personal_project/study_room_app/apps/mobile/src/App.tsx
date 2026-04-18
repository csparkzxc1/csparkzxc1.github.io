import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./navigation/RootNavigator";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { loadSession } from "./session";

type BootState = "loading" | "onboarding" | "main";

export default function App() {
  const [state, setState] = useState<BootState>("loading");

  useEffect(() => {
    loadSession().then((ready) => setState(ready ? "main" : "onboarding"));
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {state === "loading" ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      ) : state === "onboarding" ? (
        <OnboardingScreen onComplete={() => setState("main")} />
      ) : (
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}
