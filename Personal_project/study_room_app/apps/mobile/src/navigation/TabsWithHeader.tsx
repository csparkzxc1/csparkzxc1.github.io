import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text } from "react-native";
import { TodayScreen } from "../screens/TodayScreen";
import { StudentsScreen } from "../screens/StudentsScreen";
import { ClassesScreen } from "../screens/ClassesScreen";
import { AttendanceScreen } from "../screens/AttendanceScreen";
import { BillingScreen } from "../screens/BillingScreen";
import type { RootStackParamList } from "../App";

type RootTabParamList = {
  Today: undefined;
  Students: undefined;
  Classes: undefined;
  Attendance: undefined;
  Billing: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

type Props = NativeStackScreenProps<RootStackParamList, "Tabs">;

export function TabsWithHeader({ navigation }: Props) {
  const headerRight = () => (
    <Pressable
      onPress={() => navigation.navigate("Settings")}
      hitSlop={10}
      style={{ paddingHorizontal: 12 }}
    >
      <Text style={{ fontSize: 18 }}>⚙</Text>
    </Pressable>
  );

  return (
    <Tab.Navigator screenOptions={{ headerRight }}>
      <Tab.Screen name="Today" component={TodayScreen} options={{ title: "오늘" }} />
      <Tab.Screen name="Students" component={StudentsScreen} options={{ title: "학생" }} />
      <Tab.Screen name="Classes" component={ClassesScreen} options={{ title: "반" }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ title: "출결" }} />
      <Tab.Screen name="Billing" component={BillingScreen} options={{ title: "정산" }} />
    </Tab.Navigator>
  );
}
