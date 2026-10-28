import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import type { BottomTabParamList, RootStackParamList } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../theme/ThemeProvider';
import HomeScreen from '../screens/HomeScreen';
import MedicineListScreen from '../screens/MedicineListScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MedicineFormScreen from '../screens/MedicineFormScreen';
import PaywallScreen from '../screens/PaywallScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

const TAB_ICONS: Record<Exclude<keyof BottomTabParamList, 'MedicineList'>, [string, string]> = {
  Home: ['home', 'home-outline'],
  Calendar: ['calendar', 'calendar-outline'],
  Settings: ['settings', 'settings-outline'],
};

function BottomTabNavigator() {
  const { t } = useI18n();
  const { colors, scheme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 66,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
          backgroundColor: colors.surface,
          borderTopWidth: scheme === 'dark' ? 1 : 0,
          borderTopColor: colors.line,
          elevation: 12,
          shadowColor: '#1A2246',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: scheme === 'dark' ? 0 : 0.06,
          shadowRadius: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'MedicineList') {
            return <MaterialCommunityIcons name="pill" size={size} color={color} />;
          }
          const [on, off] = TAB_ICONS[route.name];
          return (
            <Ionicons
              name={(focused ? on : off) as React.ComponentProps<typeof Ionicons>['name']}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('tab.home') }} />
      <Tab.Screen name="MedicineList" component={MedicineListScreen} options={{ tabBarLabel: t('tab.medicines') }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ tabBarLabel: t('tab.calendar') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: t('tab.settings') }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { t } = useI18n();
  const { colors, scheme } = useTheme();

  const navTheme = useMemo<Theme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.brand,
        background: colors.bg,
        card: colors.bg,
        text: colors.text,
        border: colors.line,
      },
    };
  }, [scheme, colors]);

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          headerShadowVisible: false,
          headerBackTitle: t('nav.back'),
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Main" component={BottomTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="MedicineForm" component={MedicineFormScreen} />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
