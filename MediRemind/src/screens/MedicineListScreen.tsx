import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import type { Medicine, RootStackParamList } from '../types';
import { useMedicineStore } from '../store/medicineStore';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/theme';
import MedicineCard from '../components/MedicineCard';
import ScreenHeader from '../components/ScreenHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const OPEN_OFFSET = -84;

function SwipeableRow({
  medicine,
  onPress,
  onToggleActive,
  onDelete,
}: {
  medicine: Medicine;
  onPress: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const translateX = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);

  const animateTo = (toValue: number) => {
    openRef.current = toValue !== 0;
    setOpen(openRef.current);
    Animated.spring(translateX, { toValue, useNativeDriver: true }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8,
      onPanResponderMove: (_, { dx }) => {
        const base = openRef.current ? OPEN_OFFSET : 0;
        translateX.setValue(Math.max(Math.min(base + dx, 0), -120));
      },
      onPanResponderRelease: (_, { dx }) => {
        const x = (openRef.current ? OPEN_OFFSET : 0) + dx;
        animateTo(x < OPEN_OFFSET / 2 ? OPEN_OFFSET : 0);
      },
      onPanResponderTerminate: () => animateTo(openRef.current ? OPEN_OFFSET : 0),
    })
  ).current;

  return (
    <View style={styles.swipeWrapper}>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => {
          animateTo(0);
          onDelete();
        }}
        accessibilityLabel={t('common.delete')}
      >
        <Ionicons name="trash" size={22} color="#FFF" />
        <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
      </TouchableOpacity>

      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <MedicineCard
          medicine={medicine}
          onPress={() => (open ? animateTo(0) : onPress())}
          onToggleActive={onToggleActive}
        />
      </Animated.View>
    </View>
  );
}

export default function MedicineListScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { medicines, isLoading, deleteMedicine, toggleActive } = useMedicineStore();

  const handleDelete = (medicine: Medicine) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(t('list.deleteTitle'), t('list.deleteBody', { name: medicine.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteMedicine(medicine.id).catch((e) => {
            console.warn('[list] delete failed', e);
            Alert.alert(t('common.error'), t('form.errSave'));
          });
        },
      },
    ]);
  };

  const addButton = (
    <TouchableOpacity
      style={styles.addFab}
      onPress={() => navigation.navigate('MedicineForm')}
      accessibilityLabel={t('home.addA11y')}
    >
      <Ionicons name="add" size={24} color={colors.onBrand} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t('list.title')} right={addButton} />

      {medicines.length === 0 && !isLoading ? (
        <View style={styles.empty}>
          <Ionicons name="medical-outline" size={72} color={colors.textFaint} />
          <Text style={styles.emptyTitle}>{t('list.emptyTitle')}</Text>
          <Text style={styles.emptyDesc}>{t('list.emptyDesc')}</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('MedicineForm')}>
            <Ionicons name="add-circle" size={18} color={colors.onBrand} />
            <Text style={styles.emptyBtnText}>{t('list.emptyCta')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SwipeableRow
              medicine={item}
              onPress={() => navigation.navigate('MedicineForm', { medicineId: item.id })}
              onToggleActive={() => {
                Haptics.selectionAsync().catch(() => {});
                toggleActive(item.id);
              }}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    addFab: {
      backgroundColor: c.brand,
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.brand,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    list: { padding: 16, paddingBottom: 32 },
    swipeWrapper: { borderRadius: 18, marginVertical: 6, overflow: 'hidden' },
    deleteBtn: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 84,
      backgroundColor: c.danger,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
    },
    deleteBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginTop: 2 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: c.text, marginTop: 20, marginBottom: 10 },
    emptyDesc: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    emptyBtn: {
      flexDirection: 'row',
      backgroundColor: c.brand,
      borderRadius: 24,
      paddingHorizontal: 24,
      paddingVertical: 13,
      alignItems: 'center',
      gap: 8,
    },
    emptyBtnText: { color: c.onBrand, fontSize: 15, fontWeight: '700' },
  });
