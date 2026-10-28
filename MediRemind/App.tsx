import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import AppNavigator from './src/navigation/AppNavigator';
import Paywall from './src/components/Paywall';
import TrialIntro from './src/components/TrialIntro';
import { getDb } from './src/db/database';
import { useMedicineStore } from './src/store/medicineStore';
import { useDoseStore } from './src/store/doseStore';
import {
  ensurePermission,
  setupNotificationCategories,
  syncNotifications,
  takeResponseDoses,
} from './src/notifications/notifications';
import { dateKey } from './src/lib/schedule';
import { EntitlementProvider, useEntitlement } from './src/purchase/EntitlementProvider';
import { I18nProvider, useI18n } from './src/i18n/I18nProvider';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <I18nProvider>
          <ThemeProvider>
            <EntitlementProvider>
              <Root />
            </EntitlementProvider>
          </ThemeProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

async function handleResponse(response: Notifications.NotificationResponse) {
  const doses = await takeResponseDoses(response);
  if (doses.length === 0) return;
  await useDoseStore.getState().markFromNotification(useMedicineStore.getState().medicines, doses);
}

function Root() {
  const { t, language } = useI18n();
  const { scheme, colors } = useTheme();
  const { loading: entitlementLoading, status } = useEntitlement();
  const [ready, setReady] = useState(false);
  const firstLanguage = useRef(language);

  useEffect(() => {
    (async () => {
      try {
        await getDb();
        await useMedicineStore.getState().loadMedicines();
        const medicines = useMedicineStore.getState().medicines;
        await useDoseStore.getState().syncDoses(medicines, dateKey(new Date()));

        await setupNotificationCategories();
        if (await ensurePermission()) await syncNotifications(medicines);

        // A "Mark taken" tap that cold-started the app.
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last) await handleResponse(last);
      } catch (error) {
        console.error('[App] Initialization error:', error);
        Alert.alert(t('app.initErrorTitle'), t('app.initErrorBody'));
      } finally {
        setReady(true);
      }
    })();

    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      handleResponse(r).catch((e) => console.warn('[App] response failed', e));
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notification text and the action button are localized at schedule time.
  useEffect(() => {
    if (!ready || language === firstLanguage.current) return;
    firstLanguage.current = language;
    setupNotificationCategories()
      .then(() => syncNotifications(useMedicineStore.getState().medicines))
      .catch((e) => console.warn('[App] relocalize failed', e));
  }, [language, ready]);

  if (!ready || entitlementLoading) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.brand }]}>
        <StatusBar style="light" />
        <Text style={styles.splashIcon}>💊</Text>
        <Text style={styles.splashTitle}>MediRemind</Text>
        <Text style={styles.splashSub}>{t('app.subtitle')}</Text>
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
    );
  }

  const statusBar = <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;

  if (status === 'new') {
    return (
      <>
        {statusBar}
        <TrialIntro />
      </>
    );
  }

  if (status === 'locked') {
    return (
      <>
        {statusBar}
        <Paywall />
      </>
    );
  }

  return (
    <>
      {statusBar}
      <AppNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashIcon: { fontSize: 64, marginBottom: 16 },
  splashTitle: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  splashSub: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 6, marginBottom: 40 },
});
