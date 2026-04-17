import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { TodayScreen } from "../screens/TodayScreen";
import { StudentsScreen } from "../screens/StudentsScreen";
import { ClassesScreen } from "../screens/ClassesScreen";
import { AttendanceScreen } from "../screens/AttendanceScreen";
import { BillingScreen } from "../screens/BillingScreen";

export type RootTabParamList = {
  Today: undefined;
  Students: undefined;
  Classes: undefined;
  Attendance: undefined;
  Billing: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Today" component={TodayScreen} options={{ title: "오늘" }} />
      <Tab.Screen name="Students" component={StudentsScreen} options={{ title: "학생" }} />
      <Tab.Screen name="Classes" component={ClassesScreen} options={{ title: "반" }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ title: "출결" }} />
      <Tab.Screen name="Billing" component={BillingScreen} options={{ title: "정산" }} />
    </Tab.Navigator>
  );
}
