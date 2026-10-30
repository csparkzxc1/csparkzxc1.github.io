import React, { useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import type { Medicine, RootStackParamList } from '../types';
import { useMedicineStore } from '../store/medicineStore';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/theme';
import MedicineCard from '../components/MedicineCard';
import { useAddMedicine } from '../hooks/useAddMedicine';
import ScreenHeader from '../components/ScreenHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ACTION_WIDTH = 84;

/**
 * Swipe left to reveal Delete. Uses gesture-handler's native swipe so the row
 * tracks the finger smoothly and doesn't fight the list's vertical scroll.
 */
function SwipeableRow({
  medicine,
  onPress,
  onToggleActive,
  onDelete,
  onOpen,
}: {
  medicine: Medicine;
  onPress: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  /** Lets the list close the previously open row. */
  onOpen: (row: Swipeable) => void;
}) {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const ref = useRef<Swipeable>(null);
  const open = useRef(false);

  const renderRightActions = (_: unknown, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-ACTION_WIDTH, -20, 0],
      outputRange: [1, 0.7, 0.7],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => {
          ref.current?.close();
          onDelete();
        }}
        accessibilityLabel={t('common.delete')}
      >
        <Animated.View style={[styles.deleteInner, { transform: [{ scale }] }]}>
          <Ionicons name="trash" size={22} color="#FFF" />
          <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.row}>
      <Swipeable
        ref={ref}
        friction={1.6}
        rightThreshold={ACTION_WIDTH / 2}
        overshootRight={false}
        renderRightActions={renderRightActions}
        // An opaque backing so a dimmed (inactive) card doesn't show the button behind it.
        childrenContainerStyle={styles.rowBacking}
        onSwipeableWillOpen={() => {
          open.current = true;
          Haptics.selectionAsync().catch(() => {});
          if (ref.current) onOpen(ref.current);
        }}
        onSwipeableWillClose={() => {
          open.current = false;
        }}
      >
        <MedicineCard
          medicine={medicine}
          onPress={() => (open.current ? ref.current?.close() : onPress())}
          onToggleActive={onToggleActive}
        />
      </Swipeable>
    </View>
  );
}

export default function MedicineListScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { medicines, isLoading, deleteMedicine, toggleActive } = useMedicineStore();
  const addMedicine = useAddMedicine();
  const openRow = useRef<Swipeable | null>(null);

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
      onPress={addMedicine}
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
          <MaterialCommunityIcons name="pill" size={72} color={colors.textFaint} />
          <Text style={styles.emptyTitle}>{t('list.emptyTitle')}</Text>
          <Text style={styles.emptyDesc}>{t('list.emptyDesc')}</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={addMedicine}>
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
              onOpen={(row) => {
                if (openRow.current && openRow.current !== row) openRow.current.close();
                openRow.current = row;
              }}
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
    row: { marginVertical: 6 },
    rowBacking: { backgroundColor: c.bg, borderRadius: 18 },
    deleteBtn: {
      width: ACTION_WIDTH,
      marginLeft: 10,
      backgroundColor: c.danger,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteInner: { alignItems: 'center' },
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
