import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/services/databaseService';
import {
  requestNotificationPermission,
  setupNotificationChannel,
} from './src/services/notificationService';
import { initAds } from './src/services/adService';
import { useMedicineStore } from './src/store/medicineStore';
import { checkAndApplyUpdate } from './src/utils/updateUtils';

function AppInit({ onReady }: { onReady: () => void }) {
  const { loadMedicines } = useMedicineStore();

  useEffect(() => {
    (async () => {
      try {
        // 1. OTA 업데이트 확인 (production 빌드에서만 동작)
        await checkAndApplyUpdate();

        // 2. Init DB
        await initDatabase();

        // 3. Load medicines from DB
        await loadMedicines();

        // 4. Request notification permission (graceful degradation)
        await setupNotificationChannel();
        const granted = await requestNotificationPermission();
        if (!granted) {
          console.warn('[App] Notification permission not granted.');
        }

        // 5. Init ads
        initAds();
      } catch (error) {
        console.error('[App] Initialization error:', error);
        Alert.alert(
          '앱 초기화 오류',
          '앱을 시작하는 중 문제가 발생했습니다. 앱을 재시작해 주세요.',
          [{ text: '확인' }]
        );
      } finally {
        onReady();
      }
    })();
  }, []);

  return null;
}

export default function App() {
  const [isReady, setIsReady] = useState(false);

  if (!isReady) {
    return (
      <GestureHandlerRootView style={styles.loadingContainer}>
        <StatusBar style="light" />
        <AppInit onReady={() => setIsReady(true)} />
        <View style={styles.splashBg}>
          <Text style={styles.splashIcon}>💊</Text>
          <Text style={styles.splashTitle}>MediRemind</Text>
          <Text style={styles.splashSub}>약 복용 알리미</Text>
          <ActivityIndicator
            color="#FFFFFF"
            size="large"
            style={styles.spinner}
          />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  splashBg: {
    flex: 1,
    backgroundColor: '#4A90D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  splashSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
    marginBottom: 40,
  },
  spinner: {
    marginTop: 8,
  },
});
