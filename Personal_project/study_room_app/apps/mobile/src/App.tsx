import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TabsWithHeader } from "./navigation/TabsWithHeader";
import { SettingsScreen } from "./screens/SettingsScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { loadSession } from "./session";

type BootState = "loading" | "onboarding" | "main";

export type RootStackParamList = {
  Tabs: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
          <Stack.Navigator>
            <Stack.Screen
              name="Tabs"
              component={TabsWithHeader}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Settings"
              options={{ presentation: "modal", headerShown: false }}
            >
              {({ navigation }) => (
                <SettingsScreen
                  onClose={() => navigation.goBack()}
                  onSignedOut={() => setState("onboarding")}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}
