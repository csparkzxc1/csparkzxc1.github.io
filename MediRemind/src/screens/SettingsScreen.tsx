import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  getNotificationSettings,
  saveNotificationSettings,
  getAdRemoved,
  setAdRemoved,
} from '../services/databaseService';
import { useDoseStore } from '../store/doseStore';
import { cancelAllNotifications } from '../services/notificationService';
import { useMedicineStore } from '../store/medicineStore';
import { checkAndApplyUpdate, getBuildInfo } from '../utils/updateUtils';

const APP_VERSION = '1.0.0';

function SettingRow({
  icon,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
  dangerous,
}: {
  icon: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  dangerous?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + '22' }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, dangerous && styles.dangerTitle]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (
        onPress ? <Ionicons name="chevron-forward" size={18} color="#CCC" /> : null
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [adRemoved, setAdRemovedState] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const buildInfo = getBuildInfo();

  const { clearAllRecords } = useDoseStore();
  const { medicines } = useMedicineStore();

  useEffect(() => {
    getNotificationSettings().then((s) => {
      setSoundEnabled(s.sound);
      setVibrationEnabled(s.vibration);
    });
    getAdRemoved().then(setAdRemovedState);
  }, []);

  const handleSoundToggle = async (val: boolean) => {
    setSoundEnabled(val);
    await saveNotificationSettings({ sound: val, vibration: vibrationEnabled });
    Haptics.selectionAsync();
  };

  const handleVibrationToggle = async (val: boolean) => {
    setVibrationEnabled(val);
    await saveNotificationSettings({ sound: soundEnabled, vibration: val });
    Haptics.selectionAsync();
  };

  const handleResetRecords = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      '복용 기록 초기화',
      '모든 복용 기록이 삭제됩니다.\n이 작업은 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            await clearAllRecords();
            Alert.alert('완료', '복용 기록이 초기화되었습니다.');
          },
        },
      ]
    );
  };

  const handleRemoveAd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      '광고 제거',
      '이 기능은 인앱결제로 제공됩니다.\n(현재 버전에서는 테스트 목적으로 무료 적용됩니다)',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '광고 제거',
          onPress: async () => {
            await setAdRemoved(true);
            setAdRemovedState(true);
            Alert.alert('감사합니다!', '광고가 제거되었습니다. 앱을 재시작하면 적용됩니다.');
          },
        },
      ]
    );
  };

  const handleCheckUpdate = async () => {
    if (__DEV__) {
      Alert.alert('업데이트', '개발 환경에서는 OTA 업데이트를 사용할 수 없습니다.');
      return;
    }
    setIsCheckingUpdate(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await checkAndApplyUpdate();
    setIsCheckingUpdate(false);
    if (result.isError) {
      Alert.alert('업데이트 확인 실패', '네트워크 연결을 확인해 주세요.');
    } else if (!result.isAvailable) {
      Alert.alert('최신 버전', '현재 최신 버전을 사용 중입니다.');
    }
    // isAvailable=true면 reloadAsync()로 앱이 자동 재시작됨
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://example.com/privacy').catch(() => {
      Alert.alert('오류', '개인정보처리방침을 열 수 없습니다.');
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>설정</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ─ 알림 ─ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>알림</Text>
          <View style={styles.card}>
            <SettingRow
              icon="volume-high"
              iconColor="#4A90D9"
              title="알림 소리"
              right={
                <Switch
                  value={soundEnabled}
                  onValueChange={handleSoundToggle}
                  trackColor={{ false: '#CCC', true: '#4A90D9' }}
                  thumbColor="#FFF"
                />
              }
            />
            <View style={styles.divider} />
            <SettingRow
              icon="phone-portrait"
              iconColor="#9B59B6"
              title="알림 진동"
              right={
                <Switch
                  value={vibrationEnabled}
                  onValueChange={handleVibrationToggle}
                  trackColor={{ false: '#CCC', true: '#9B59B6' }}
                  thumbColor="#FFF"
                />
              }
            />
          </View>
        </View>

        {/* ─ 데이터 ─ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>데이터</Text>
          <View style={styles.card}>
            <SettingRow
              icon="refresh-circle"
              iconColor="#D9534F"
              title="복용 기록 초기화"
              subtitle={`${medicines.length}개 약 등록됨`}
              onPress={handleResetRecords}
              dangerous
            />
          </View>
        </View>

        {/* ─ 결제 ─ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>구매</Text>
          <View style={styles.card}>
            <SettingRow
              icon="ban"
              iconColor="#F0AD4E"
              title="광고 제거"
              subtitle={adRemoved ? '✓ 구매 완료' : '₩2,200 · 영구 제거'}
              onPress={adRemoved ? undefined : handleRemoveAd}
            />
          </View>
        </View>

        {/* ─ 업데이트 ─ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>업데이트</Text>
          <View style={styles.card}>
            <SettingRow
              icon="cloud-download-outline"
              iconColor="#4A90D9"
              title={isCheckingUpdate ? '확인 중…' : '업데이트 확인'}
              subtitle={
                buildInfo.channel
                  ? `채널: ${buildInfo.channel}`
                  : '최신 버전 여부를 확인합니다'
              }
              onPress={isCheckingUpdate ? undefined : handleCheckUpdate}
            />
          </View>
        </View>

        {/* ─ 앱 정보 ─ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>앱 정보</Text>
          <View style={styles.card}>
            <SettingRow
              icon="shield-checkmark"
              iconColor="#1ABC9C"
              title="개인정보처리방침"
              onPress={handlePrivacyPolicy}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="information-circle"
              iconColor="#888"
              title="앱 버전"
              subtitle={`v${APP_VERSION}${buildInfo.runtimeVersion ? ` (${buildInfo.runtimeVersion})` : ''}`}
            />
            {buildInfo.updateId && (
              <>
                <View style={styles.divider} />
                <SettingRow
                  icon="git-commit-outline"
                  iconColor="#AAA"
                  title="업데이트 ID"
                  subtitle={buildInfo.updateId.slice(0, 8) + '…'}
                />
              </>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            MediRemind © 2024{'\n'}
            약 복용 알리미 앱
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerBar: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
  },
  scroll: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222',
  },
  dangerTitle: {
    color: '#D9534F',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 66,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#C0C0C0',
    textAlign: 'center',
    lineHeight: 20,
  },
});
